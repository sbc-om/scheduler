import { env } from "@/lib/env";
import {
  releaseAdvisoryLock,
  tryAcquireAdvisoryLock,
} from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  QUEUE_DEAD_LETTER,
  QUEUE_EXECUTE_WORKFLOW,
  getBoss,
  type ExecuteWorkflowJob,
} from "@/lib/queue";
import {
  finishRun,
  markRunRunning,
} from "@/modules/executions/repository";
import { dispatchWorkflow } from "@/modules/jobs/dispatch";
import { runWorkflow } from "@/modules/jobs/executor";
import {
  claimDueSchedules,
  recomputeNextRun,
} from "@/modules/schedules/repository";
import { getVersionById } from "@/modules/workflows/repository";

// Stable lock key for the scheduler polling loop. Any int fits in bigint.
const SCHEDULER_LEADER_LOCK_KEY = 0x5c1ed01e; // "SCHEDULE"
const WORKER_NAME = `worker-${process.pid}`;

declare global {
  var __schedulerWorkerStarted: boolean | undefined;
  var __schedulerWorkerReady: Promise<void> | undefined;
}

async function processExecute(job: ExecuteWorkflowJob) {
  const log = logger.child({ runId: job.workflowRunId });
  log.info("executing workflow run");
  const version = await getVersionById(job.tenantId, job.workflowVersionId);
  if (!version) {
    await finishRun(job.workflowRunId, "failed", null, "Version not found");
    return;
  }
  await markRunRunning(job.workflowRunId);
  try {
    const result = await runWorkflow(version.definition, {
      tenantId: job.tenantId,
      workflowRunId: job.workflowRunId,
      input: job.input ?? {},
      output: {},
    });
    await finishRun(
      job.workflowRunId,
      result.success ? "success" : "failed",
      { ok: result.success },
      result.error,
    );
    log.info({ status: result.success ? "success" : "failed" }, "run finished");
  } catch (err) {
    const msg = (err as Error).message;
    await finishRun(job.workflowRunId, "failed", null, msg);
    log.error({ err: msg }, "run crashed");
    throw err;
  }
}

/**
 * Polls the schedules table and enqueues due work.
 *
 * Only one process at a time may run this loop (cluster-wide), guarded by a
 * PostgreSQL session-level advisory lock. Other worker replicas hot-standby:
 * they retry acquiring the lock periodically, and take over instantly if the
 * current leader dies and its TCP session drops.
 */
async function schedulerLoop() {
  // Retry acquiring the leader lock forever.
  for (;;) {
    const holder = await tryAcquireAdvisoryLock(SCHEDULER_LEADER_LOCK_KEY);
    if (!holder) {
      await new Promise((r) => setTimeout(r, 5_000));
      continue;
    }
    logger.info({ worker: WORKER_NAME }, "scheduler leader acquired");
    try {
      for (;;) {
        try {
          const due = await claimDueSchedules(env.WORKER_SCHEDULER_BATCH);
          if (due.length > 0) {
            // Dispatch in parallel — each dispatch is independent and the
            // schedule row is already claimed so duplicates are impossible.
            await Promise.all(
              due.map(async (s) => {
                if (!s.workflow_id) return;
                try {
                  await dispatchWorkflow({
                    tenantId: s.tenant_id,
                    workflowId: s.workflow_id,
                    scheduleId: s.id,
                    triggerSource: `schedule:${s.schedule_type}`,
                    payload: s.payload ?? {},
                    priority: s.priority,
                  });
                } catch (e) {
                  logger.error(
                    { err: (e as Error).message, scheduleId: s.id },
                    "dispatch failed",
                  );
                }
                if (
                  s.schedule_type === "once" ||
                  s.schedule_type === "delayed"
                ) {
                  return;
                }
                try {
                  await recomputeNextRun(s.tenant_id, s.id);
                } catch (e) {
                  logger.error(
                    { err: (e as Error).message, scheduleId: s.id },
                    "recompute failed",
                  );
                }
              }),
            );
          }
        } catch (e) {
          logger.error({ err: (e as Error).message }, "scheduler loop error");
        }
        await new Promise((r) =>
          setTimeout(r, env.WORKER_SCHEDULER_INTERVAL_MS),
        );
      }
    } finally {
      await releaseAdvisoryLock(holder, SCHEDULER_LEADER_LOCK_KEY).catch(
        () => undefined,
      );
    }
  }
}

export async function startWorkerRuntime(): Promise<void> {
  if (global.__schedulerWorkerStarted) {
    return global.__schedulerWorkerReady ?? Promise.resolve();
  }

  global.__schedulerWorkerStarted = true;
  global.__schedulerWorkerReady = (async () => {
    const boss = await getBoss();
    logger.info({ worker: WORKER_NAME }, "worker started");

    // `localConcurrency` is how many jobs run in parallel in this worker
    // replica; `batchSize` is how many are fetched per poll. Combined with
    // horizontal scaling (N worker pods) this gives near-linear throughput.
    // Dead-lettering happens in a side queue so a bad payload cannot poison
    // retries forever.
    await boss.work<ExecuteWorkflowJob>(
      QUEUE_EXECUTE_WORKFLOW,
      {
        batchSize: env.WORKER_EXECUTE_BATCH,
        localConcurrency: env.WORKER_EXECUTE_TEAM,
        pollingIntervalSeconds: env.WORKER_EXECUTE_POLL_SECONDS,
      },
      async (jobs) => {
        // Run each job in parallel within this batch; one failure does not
        // block siblings. Failures are rethrown so pg-boss can retry, and a
        // dead-letter copy is queued once the job exhausts retries.
        await Promise.all(
          jobs.map(async (job) => {
            try {
              await processExecute(job.data);
            } catch (err) {
              await boss
                .send(QUEUE_DEAD_LETTER, {
                  originalJobId: job.id,
                  data: job.data,
                  error: (err as Error).message,
                })
                .catch((e) =>
                  logger.error(
                    { err: (e as Error).message },
                    "dead-letter send failed",
                  ),
                );
              throw err;
            }
          }),
        );
      },
    );

    void schedulerLoop().catch((err) => {
      logger.fatal({ err: (err as Error).message }, "scheduler loop crashed");
      global.__schedulerWorkerStarted = false;
      global.__schedulerWorkerReady = undefined;
      process.exit(1);
    });

    const shutdown = async (signal: string) => {
      logger.info({ signal }, "shutting down worker");
      try {
        await boss.stop({ graceful: true, timeout: 30_000 });
      } catch (e) {
        logger.error({ err: (e as Error).message }, "boss stop failed");
      }
      process.exit(0);
    };
    process.once("SIGINT", () => void shutdown("SIGINT"));
    process.once("SIGTERM", () => void shutdown("SIGTERM"));
  })();

  return global.__schedulerWorkerReady;
}