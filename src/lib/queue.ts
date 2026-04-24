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
  });

  global.__pgBossReady = boss.start().then(async (instance) => {
    logger.info("pg-boss started");
    await instance.createQueue(QUEUE_EXECUTE_WORKFLOW);
    await instance.createQueue(QUEUE_DEAD_LETTER);
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
