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
