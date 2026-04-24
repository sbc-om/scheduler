import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { env } from "../env";

declare global {
  // eslint-disable-next-line no-var
  var __schedulerPgPool: Pool | undefined;
}

export const pool: Pool =
  global.__schedulerPgPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30_000,
  });

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
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
