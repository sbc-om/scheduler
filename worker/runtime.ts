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

const POLL_INTERVAL_MS = 5_000;
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

async function schedulerLoop() {
  for (;;) {
    try {
      const due = await claimDueSchedules(25);
      for (const s of due) {
        if (!s.workflow_id) continue;
        logger.info({ scheduleId: s.id }, "dispatching schedule");
        try {
          await dispatchWorkflow({
            tenantId: s.tenant_id,
            workflowId: s.workflow_id,
            scheduleId: s.id,
            triggerSource: `schedule:${s.schedule_type}`,
            payload: s.payload ?? {},
          });
        } catch (e) {
          logger.error({ err: (e as Error).message, scheduleId: s.id }, "dispatch failed");
        }
        if (s.schedule_type === "once" || s.schedule_type === "delayed") {
          continue;
        }
        await recomputeNextRun(s.tenant_id, s.id);
      }
    } catch (e) {
      logger.error({ err: (e as Error).message }, "scheduler loop error");
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
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

    await boss.work<ExecuteWorkflowJob>(
      QUEUE_EXECUTE_WORKFLOW,
      { batchSize: 5, pollingIntervalSeconds: 2 },
      async (jobs) => {
        for (const job of jobs) {
          try {
            await processExecute(job.data);
          } catch (err) {
            await boss.send(QUEUE_DEAD_LETTER, {
              originalJobId: job.id,
              data: job.data,
              error: (err as Error).message,
            });
            throw err;
          }
        }
      },
    );

    void schedulerLoop().catch((err) => {
      logger.fatal({ err: (err as Error).message }, "scheduler loop crashed");
      global.__schedulerWorkerStarted = false;
      global.__schedulerWorkerReady = undefined;
      process.exit(1);
    });

    process.once("SIGINT", async () => {
      logger.info("shutting down");
      await boss.stop();
      process.exit(0);
    });
  })();

  return global.__schedulerWorkerReady;
}