import { queryOne, queryRows, query, withTransaction } from "@/lib/db";
import { computeNextRun, type ScheduleType } from "./next-run";

export type ScheduleRow = {
  id: string;
  tenant_id: string;
  workflow_id: string | null;
  workflow_version_id: string | null;
  name: string;
  schedule_type: ScheduleType;
  cron_expression: string | null;
  rrule: string | null;
  interval_seconds: number | null;
  run_at: string | null;
  timezone: string;
  status: "active" | "paused" | "completed" | "cancelled" | "archived";
  priority: number;
  max_retries: number;
  retry_backoff_seconds: number;
  timeout_seconds: number;
  concurrency_key: string | null;
  max_concurrency: number;
  next_run_at: string | null;
  last_run_at: string | null;
  start_at: string | null;
  end_at: string | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CreateScheduleInput = {
  tenantId: string;
  workflowId: string;
  name: string;
  scheduleType: ScheduleType;
  cronExpression?: string | null;
  rrule?: string | null;
  intervalSeconds?: number | null;
  runAt?: Date | null;
  timezone?: string;
  priority?: number;
  maxRetries?: number;
  retryBackoffSeconds?: number;
  timeoutSeconds?: number;
  startAt?: Date | null;
  endAt?: Date | null;
  payload?: Record<string, unknown>;
  createdBy?: string | null;
};

export async function listSchedules(
  tenantId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<ScheduleRow[]> {
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;
  return queryRows<ScheduleRow>(
    `SELECT * FROM schedules
      WHERE tenant_id = $1
      ORDER BY updated_at DESC
      LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
}

export async function countSchedules(tenantId: string): Promise<number> {
  const r = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM schedules WHERE tenant_id = $1`,
    [tenantId],
  );
  return Number(r?.count ?? 0);
}

export async function getSchedule(
  tenantId: string,
  id: string,
): Promise<ScheduleRow | null> {
  return queryOne<ScheduleRow>(
    `SELECT * FROM schedules WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
}

export async function createSchedule(
  input: CreateScheduleInput,
): Promise<ScheduleRow> {
  return withTransaction(async (client) => {
    const wf = await client.query<{ published_version_id: string | null }>(
      `SELECT published_version_id FROM workflows WHERE tenant_id = $1 AND id = $2`,
      [input.tenantId, input.workflowId],
    );
    const versionId = wf.rows[0]?.published_version_id ?? null;
    const next = computeNextRun({
      scheduleType: input.scheduleType,
      cronExpression: input.cronExpression,
      rrule: input.rrule,
      intervalSeconds: input.intervalSeconds,
      runAt: input.runAt,
      timezone: input.timezone,
      startAt: input.startAt,
      endAt: input.endAt,
    });

    const r = await client.query<ScheduleRow>(
      `INSERT INTO schedules
         (tenant_id, workflow_id, workflow_version_id,
          name, schedule_type, cron_expression, rrule, interval_seconds,
          run_at, timezone, priority, max_retries, retry_backoff_seconds,
          timeout_seconds, start_at, end_at, payload, next_run_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19)
       RETURNING *`,
      [
        input.tenantId,
        input.workflowId,
        versionId,
        input.name,
        input.scheduleType,
        input.cronExpression ?? null,
        input.rrule ?? null,
        input.intervalSeconds ?? null,
        input.runAt ?? null,
        input.timezone ?? "UTC",
        input.priority ?? 5,
        input.maxRetries ?? 5,
        input.retryBackoffSeconds ?? 60,
        input.timeoutSeconds ?? 300,
        input.startAt ?? null,
        input.endAt ?? null,
        JSON.stringify(input.payload ?? {}),
        next,
        input.createdBy ?? null,
      ],
    );
    return r.rows[0];
  });
}

export async function setStatus(
  tenantId: string,
  id: string,
  status: ScheduleRow["status"],
): Promise<ScheduleRow | null> {
  return queryOne<ScheduleRow>(
    `UPDATE schedules SET status = $1 WHERE tenant_id = $2 AND id = $3 RETURNING *`,
    [status, tenantId, id],
  );
}

export async function deleteSchedule(tenantId: string, id: string): Promise<void> {
  await query(`DELETE FROM schedules WHERE tenant_id = $1 AND id = $2`, [
    tenantId,
    id,
  ]);
}

export async function recomputeNextRun(
  tenantId: string,
  id: string,
  from: Date = new Date(),
): Promise<ScheduleRow | null> {
  const current = await getSchedule(tenantId, id);
  if (!current) return null;
  const next = computeNextRun(
    {
      scheduleType: current.schedule_type,
      cronExpression: current.cron_expression,
      rrule: current.rrule,
      intervalSeconds: current.interval_seconds,
      runAt: current.run_at,
      timezone: current.timezone,
      startAt: current.start_at,
      endAt: current.end_at,
      lastRunAt: current.last_run_at,
    },
    from,
  );
  const r = await query<ScheduleRow>(
    `UPDATE schedules SET next_run_at = $1 WHERE tenant_id = $2 AND id = $3 RETURNING *`,
    [next, tenantId, id],
  );
  return r.rows[0] ?? null;
}

export async function claimDueSchedules(
  limit = 50,
  now: Date = new Date(),
): Promise<ScheduleRow[]> {
  return withTransaction(async (client) => {
    // Fairness + locking in two steps, because Postgres forbids FOR UPDATE
    // together with DISTINCT ON. Step 1: pick at most one candidate per
    // tenant (cheap index scan). Step 2: lock the surviving rows with
    // SKIP LOCKED so concurrent leaders never collide.
    const r = await client.query<ScheduleRow>(
      `WITH candidates AS (
         SELECT DISTINCT ON (tenant_id) id
           FROM schedules
          WHERE status = 'active'
            AND next_run_at IS NOT NULL
            AND next_run_at <= $1
            AND (start_at IS NULL OR start_at <= $1)
            AND (end_at IS NULL OR end_at > $1)
          ORDER BY tenant_id, priority ASC, next_run_at ASC
       ),
       locked AS (
         SELECT s.*
           FROM schedules s
           JOIN candidates c ON c.id = s.id
          WHERE s.status = 'active'
            AND s.next_run_at IS NOT NULL
            AND s.next_run_at <= $1
          ORDER BY s.priority ASC, s.next_run_at ASC
          LIMIT $2
          FOR UPDATE OF s SKIP LOCKED
       )
       SELECT * FROM locked`,
      [now, limit],
    );
    if (r.rows.length === 0) return [];
    const ids = r.rows.map((s) => s.id);
    await client.query(
      `UPDATE schedules
          SET last_run_at = $1,
              next_run_at = NULL
        WHERE id = ANY($2::uuid[])`,
      [now, ids],
    );
    return r.rows;
  });
}
