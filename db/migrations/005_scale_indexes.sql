-- Indexes tuned for large-scale, multi-tenant hot paths.
-- All are IF NOT EXISTS so re-running the migrator is safe.

-- Fast "my tenant's failures in the last 24h" and status filters on dashboards.
CREATE INDEX IF NOT EXISTS workflow_runs_tenant_status_created_idx
  ON workflow_runs (tenant_id, status, created_at DESC);

-- Very small partial index for operator views and supervisor queries over
-- in-flight work; stays tiny even when there are millions of finished runs.
CREATE INDEX IF NOT EXISTS workflow_runs_in_flight_idx
  ON workflow_runs (created_at DESC)
  WHERE status IN ('queued', 'running');

-- Step run listing per tenant and per-run timeline scans.
CREATE INDEX IF NOT EXISTS workflow_step_runs_tenant_run_idx
  ON workflow_step_runs (tenant_id, workflow_run_id, created_at ASC);

-- Scheduler leader uses DISTINCT ON (tenant_id) ORDER BY tenant_id, priority,
-- next_run_at. A covering partial index avoids a seq scan as schedules grow.
CREATE INDEX IF NOT EXISTS schedules_active_due_priority_idx
  ON schedules (tenant_id, priority, next_run_at)
  WHERE status = 'active' AND next_run_at IS NOT NULL;

-- Any-tenant supervisor queries looking for imminent work.
CREATE INDEX IF NOT EXISTS schedules_global_due_idx
  ON schedules (next_run_at)
  WHERE status = 'active' AND next_run_at IS NOT NULL;

-- Job executions: operator dashboards filter on status heavily, and uniqueness
-- on (tenant_id, idempotency_key) already exists, so we only need status.
CREATE INDEX IF NOT EXISTS job_executions_in_flight_idx
  ON job_executions (created_at DESC)
  WHERE status IN ('queued', 'running', 'retrying');

-- Session cleanup / auth hot path.
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx
  ON sessions (expires_at);

-- Auth flow reads tenant_memberships by user on every request.
CREATE INDEX IF NOT EXISTS tenant_memberships_user_idx
  ON tenant_memberships (user_id);

-- API key verification happens on every authenticated API call.
CREATE INDEX IF NOT EXISTS api_keys_active_prefix_idx
  ON api_keys (key_prefix)
  WHERE revoked_at IS NULL;
