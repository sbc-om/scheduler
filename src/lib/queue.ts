import { PgBoss } from "pg-boss";
import { env } from "./env";
import { logger } from "./logger";

export const QUEUE_EXECUTE_WORKFLOW = "execute-workflow";
export const QUEUE_DEAD_LETTER = "dead-letter";

declare global {
  // eslint-disable-next-line no-var
  var __pgBoss: PgBoss | undefined;
  // eslint-disable-next-line no-var
  var __pgBossReady: Promise<PgBoss> | undefined;
}

export async function getBoss(): Promise<PgBoss> {
  if (global.__pgBoss) return global.__pgBoss;
  if (global.__pgBossReady) return global.__pgBossReady;

  const boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    schema: env.PG_BOSS_SCHEMA,
    max: env.PG_BOSS_POOL_MAX,
  });

  global.__pgBossReady = boss.start().then(async (instance) => {
    logger.info("pg-boss started");
    // Execute queue: aggressive retention tuning to keep hot tables small
    // under very high job throughput. The dead-letter queue keeps records
    // longer because operators need them for incident review.
    await instance.createQueue(QUEUE_EXECUTE_WORKFLOW, {
      policy: "standard",
      retryLimit: 3,
      retryBackoff: true,
      retryDelay: 30,
      deleteAfterSeconds: 60 * 60 * 24, // 1 day of completed-job history
    });
    await instance.createQueue(QUEUE_DEAD_LETTER, {
      policy: "standard",
      deleteAfterSeconds: 60 * 60 * 24 * 30, // 30 days for forensics
    });
    global.__pgBoss = instance;
    return instance;
  });

  return global.__pgBossReady;
}

export type ExecuteWorkflowJob = {
  tenantId: string;
  workflowId: string;
  workflowVersionId: string;
  workflowRunId: string;
  scheduleId: string | null;
  triggerSource: string;
  input: Record<string, unknown>;
};
