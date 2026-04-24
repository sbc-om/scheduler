import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(16),
  API_KEY_SECRET: z.string().min(16),
  ENCRYPTION_KEY: z.string().min(16),
  WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  DEFAULT_MAX_RETRIES: z.coerce.number().int().nonnegative().default(5),
  DEFAULT_RETRY_BACKOFF_SECONDS: z.coerce.number().int().positive().default(60),
  PG_BOSS_SCHEMA: z.string().default("pgboss"),
  // --- Scalability tuning -------------------------------------------------
  PG_POOL_MAX: z.coerce.number().int().positive().default(20),
  PG_POOL_MIN: z.coerce.number().int().nonnegative().default(0),
  PG_IDLE_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(30_000),
  PG_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  PG_STATEMENT_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(15_000),
  PG_IDLE_IN_TX_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(10_000),
  PG_APP_NAME: z.string().default("scheduler"),
  PG_BOSS_POOL_MAX: z.coerce.number().int().positive().default(10),
  WORKER_SCHEDULER_BATCH: z.coerce.number().int().positive().default(100),
  WORKER_SCHEDULER_INTERVAL_MS: z.coerce.number().int().positive().default(1_000),
  WORKER_EXECUTE_BATCH: z.coerce.number().int().positive().default(25),
  WORKER_EXECUTE_TEAM: z.coerce.number().int().positive().default(10),
  WORKER_EXECUTE_POLL_SECONDS: z.coerce.number().int().positive().default(1),
  PUSH_VAPID_PUBLIC_KEY: z.string().optional(),
  PUSH_VAPID_PRIVATE_KEY: z.string().optional(),
  PUSH_VAPID_SUBJECT: z.string().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  NODE_ENV: z.string().default("development"),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
