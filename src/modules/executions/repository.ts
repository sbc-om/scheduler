import { queryOne, queryRows, query, withTransaction } from "@/lib/db";

export type WorkflowRunRow = {
  id: string;
  tenant_id: string;
  workflow_id: string;
  workflow_version_id: string;
  schedule_id: string | null;
  status: "queued" | "running" | "success" | "failed" | "cancelled" | "timed_out";
  trigger_source: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
};

export type WorkflowStepRunRow = {
  id: string;
  tenant_id: string;
  workflow_run_id: string;
  node_id: string;
  node_type: string;
  status: string;
  attempt: number;
  queued_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
};

export async function createWorkflowRun(input: {
  tenantId: string;
  workflowId: string;
  workflowVersionId: string;
  scheduleId: string | null;
  triggerSource: string;
  payload: Record<string, unknown>;
}): Promise<WorkflowRunRow> {
  const r = await query<WorkflowRunRow>(
    `INSERT INTO workflow_runs
       (tenant_id, workflow_id, workflow_version_id, schedule_id,
        status, trigger_source, input)
     VALUES ($1, $2, $3, $4, 'queued', $5, $6::jsonb)
     RETURNING *`,
    [
      input.tenantId,
      input.workflowId,
      input.workflowVersionId,
      input.scheduleId,
      input.triggerSource,
      JSON.stringify(input.payload),
    ],
  );
  return r.rows[0];
}

export async function listWorkflowRuns(
  tenantId: string,
  opts: { workflowId?: string; scheduleId?: string; limit?: number } = {},
): Promise<WorkflowRunRow[]> {
  const where: string[] = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];
  if (opts.workflowId) {
    params.push(opts.workflowId);
    where.push(`workflow_id = $${params.length}`);
  }
  if (opts.scheduleId) {
    params.push(opts.scheduleId);
    where.push(`schedule_id = $${params.length}`);
  }
  params.push(opts.limit ?? 100);
  return queryRows<WorkflowRunRow>(
    `SELECT * FROM workflow_runs
      WHERE ${where.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT $${params.length}`,
    params,
  );
}

export async function getWorkflowRun(
  tenantId: string,
  id: string,
): Promise<WorkflowRunRow | null> {
  return queryOne<WorkflowRunRow>(
    `SELECT * FROM workflow_runs WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
}

export async function listStepRuns(
  tenantId: string,
  runId: string,
): Promise<WorkflowStepRunRow[]> {
  return queryRows<WorkflowStepRunRow>(
    `SELECT * FROM workflow_step_runs
      WHERE tenant_id = $1 AND workflow_run_id = $2
      ORDER BY created_at ASC`,
    [tenantId, runId],
  );
}

export async function markRunRunning(id: string): Promise<void> {
  await query(
    `UPDATE workflow_runs SET status = 'running', started_at = now() WHERE id = $1`,
    [id],
  );
}

export async function finishRun(
  id: string,
  status: WorkflowRunRow["status"],
  output: Record<string, unknown> | null,
  errorMessage: string | null,
): Promise<void> {
  await query(
    `UPDATE workflow_runs
        SET status = $1,
            finished_at = now(),
            duration_ms = CASE
              WHEN started_at IS NOT NULL
              THEN EXTRACT(EPOCH FROM (now() - started_at))::INT * 1000
              ELSE NULL END,
            output = $2::jsonb,
            error_message = $3
      WHERE id = $4`,
    [status, output ? JSON.stringify(output) : null, errorMessage, id],
  );
}

export async function createStepRun(input: {
  tenantId: string;
  workflowRunId: string;
  nodeId: string;
  nodeType: string;
  input: Record<string, unknown> | null;
}): Promise<WorkflowStepRunRow> {
  const r = await query<WorkflowStepRunRow>(
    `INSERT INTO workflow_step_runs
       (tenant_id, workflow_run_id, node_id, node_type, status, started_at, input)
     VALUES ($1, $2, $3, $4, 'running', now(), $5::jsonb)
     RETURNING *`,
    [
      input.tenantId,
      input.workflowRunId,
      input.nodeId,
      input.nodeType,
      input.input ? JSON.stringify(input.input) : null,
    ],
  );
  return r.rows[0];
}

export async function finishStepRun(
  id: string,
  status: "success" | "failed" | "skipped",
  output: Record<string, unknown> | null,
  errorMessage: string | null,
): Promise<void> {
  await query(
    `UPDATE workflow_step_runs
        SET status = $1,
            finished_at = now(),
            duration_ms = CASE
              WHEN started_at IS NOT NULL
              THEN EXTRACT(EPOCH FROM (now() - started_at))::INT * 1000
              ELSE NULL END,
            output = $2::jsonb,
            error_message = $3
      WHERE id = $4`,
    [status, output ? JSON.stringify(output) : null, errorMessage, id],
  );
}

export async function stats(tenantId: string): Promise<{
  total_runs: number;
  running: number;
  failed_24h: number;
  success_24h: number;
  queued: number;
}> {
  const r = await queryOne<{
    total_runs: string;
    running: string;
    failed_24h: string;
    success_24h: string;
    queued: string;
  }>(
    `SELECT
       COUNT(*)::text AS total_runs,
       COUNT(*) FILTER (WHERE status = 'running')::text AS running,
       COUNT(*) FILTER (WHERE status = 'failed' AND created_at > now() - interval '24 hours')::text AS failed_24h,
       COUNT(*) FILTER (WHERE status = 'success' AND created_at > now() - interval '24 hours')::text AS success_24h,
       COUNT(*) FILTER (WHERE status = 'queued')::text AS queued
       FROM workflow_runs
      WHERE tenant_id = $1`,
    [tenantId],
  );
  return {
    total_runs: Number(r?.total_runs ?? 0),
    running: Number(r?.running ?? 0),
    failed_24h: Number(r?.failed_24h ?? 0),
    success_24h: Number(r?.success_24h ?? 0),
    queued: Number(r?.queued ?? 0),
  };
}

export async function createJobExecution(input: {
  tenantId: string;
  scheduleId: string | null;
  workflowRunId: string | null;
  executionKind: string;
  targetType: string;
  idempotencyKey: string;
  priority?: number;
  requestPayload: Record<string, unknown>;
}): Promise<string> {
  const r = await query<{ id: string }>(
    `INSERT INTO job_executions
       (tenant_id, schedule_id, workflow_run_id, execution_kind, target_type,
        idempotency_key, priority, request_payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
     ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
     RETURNING id`,
    [
      input.tenantId,
      input.scheduleId,
      input.workflowRunId,
      input.executionKind,
      input.targetType,
      input.idempotencyKey,
      input.priority ?? 5,
      JSON.stringify(input.requestPayload),
    ],
  );
  return r.rows[0]?.id ?? "";
}

export async function finishJobExecution(input: {
  id: string;
  status: "success" | "failed" | "timed_out" | "dead_lettered";
  responseStatus?: number | null;
  responseBody?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  await query(
    `UPDATE job_executions
        SET status = $1,
            finished_at = now(),
            duration_ms = CASE
              WHEN started_at IS NOT NULL
              THEN EXTRACT(EPOCH FROM (now() - started_at))::INT * 1000
              ELSE NULL END,
            response_status = $2,
            response_body = $3,
            error_message = $4
      WHERE id = $5`,
    [
      input.status,
      input.responseStatus ?? null,
      input.responseBody ?? null,
      input.errorMessage ?? null,
      input.id,
    ],
  );
}

export async function startJobExecution(id: string, workerName: string): Promise<void> {
  await query(
    `UPDATE job_executions
        SET status = 'running', started_at = now(), worker_name = $1
      WHERE id = $2`,
    [workerName, id],
  );
}

export async function listJobExecutions(
  tenantId: string,
  opts: { limit?: number } = {},
) {
  return queryRows(
    `SELECT * FROM job_executions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [tenantId, opts.limit ?? 200],
  );
}
