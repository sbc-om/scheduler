import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { env } from "../env";
import { logger } from "../logger";

declare global {
  // eslint-disable-next-line no-var
  var __schedulerPgPool: Pool | undefined;
}

function createPool(): Pool {
  const p = new Pool({
    connectionString: env.DATABASE_URL,
    application_name: env.PG_APP_NAME,
    max: env.PG_POOL_MAX,
    min: env.PG_POOL_MIN,
    idleTimeoutMillis: env.PG_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.PG_CONNECTION_TIMEOUT_MS,
    keepAlive: true,
    // Enforce server-side timeouts on every new connection so no single
    // runaway query or zombie transaction can exhaust the shared pool.
    statement_timeout: env.PG_STATEMENT_TIMEOUT_MS,
    idle_in_transaction_session_timeout: env.PG_IDLE_IN_TX_TIMEOUT_MS,
  });
  // Never let a transient backend error crash the whole process.
  p.on("error", (err) => {
    logger.error({ err: err.message }, "pg pool client error");
  });
  return p;
}

export const pool: Pool = global.__schedulerPgPool ?? createPool();

if (env.NODE_ENV !== "production") {
  global.__schedulerPgPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as unknown[]);
}

export async function queryRows<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const r = await pool.query<T>(text, params as unknown[]);
  return r.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const r = await pool.query<T>(text, params as unknown[]);
  return r.rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // swallow rollback failure; original error is more useful
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Try to acquire a session-level PostgreSQL advisory lock.
 * Returns a holder handle (keep it until you call `releaseAdvisoryLock`) or
 * `null` if another process is already holding it. Used to make cluster-wide
 * singletons (e.g. scheduler polling loop) safe when scaling workers
 * horizontally.
 */
export async function tryAcquireAdvisoryLock(
  key: number,
): Promise<PoolClient | null> {
  const client = await pool.connect();
  try {
    const r = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS locked",
      [key],
    );
    if (r.rows[0]?.locked) return client;
    client.release();
    return null;
  } catch (err) {
    client.release();
    throw err;
  }
}

export async function releaseAdvisoryLock(
  client: PoolClient,
  key: number,
): Promise<void> {
  try {
    await client.query("SELECT pg_advisory_unlock($1)", [key]);
  } finally {
    client.release();
  }
}
