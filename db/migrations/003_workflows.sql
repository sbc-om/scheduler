-- Workflows, versions, schedules and execution tables.

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  latest_version_number INTEGER NOT NULL DEFAULT 1,
  published_version_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code),
  CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  definition JSONB NOT NULL,
  checksum TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, version_number),
  CHECK (status IN ('draft', 'published', 'retired'))
);

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  workflow_version_id UUID REFERENCES workflow_versions(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  schedule_type TEXT NOT NULL,
  cron_expression TEXT,
  rrule TEXT,
  interval_seconds INTEGER,
  run_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'active',
  priority SMALLINT NOT NULL DEFAULT 5,
  max_retries SMALLINT NOT NULL DEFAULT 5,
  retry_backoff_seconds INTEGER NOT NULL DEFAULT 60,
  timeout_seconds INTEGER NOT NULL DEFAULT 300,
  concurrency_key TEXT,
  max_concurrency INTEGER NOT NULL DEFAULT 1,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (schedule_type IN ('once', 'delayed', 'cron', 'interval', 'rrule', 'manual', 'event')),
  CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'archived'))
);

CREATE INDEX IF NOT EXISTS schedules_due_idx
  ON schedules (tenant_id, next_run_at)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id) ON DELETE RESTRICT,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  trigger_source TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('queued', 'running', 'success', 'failed', 'cancelled', 'timed_out'))
);

CREATE INDEX IF NOT EXISTS workflow_runs_tenant_created_idx
  ON workflow_runs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workflow_runs_workflow_idx
  ON workflow_runs (workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workflow_runs_schedule_idx
  ON workflow_runs (schedule_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workflow_step_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt SMALLINT NOT NULL DEFAULT 0,
  queued_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  input JSONB,
  output JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('pending', 'queued', 'running', 'success', 'failed', 'skipped', 'retrying', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS workflow_step_runs_run_idx
  ON workflow_step_runs (workflow_run_id, created_at ASC);

CREATE TABLE IF NOT EXISTS job_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE SET NULL,
  execution_kind TEXT NOT NULL,
  target_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  idempotency_key TEXT NOT NULL,
  worker_name TEXT,
  priority SMALLINT NOT NULL DEFAULT 5,
  attempt SMALLINT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  request_payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key),
  CHECK (status IN ('queued', 'running', 'success', 'failed', 'retrying', 'cancelled', 'timed_out', 'dead_lettered'))
);

CREATE INDEX IF NOT EXISTS job_executions_tenant_created_idx
  ON job_executions (tenant_id, created_at DESC);

-- Triggers to keep updated_at fresh.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenants_set_updated_at ON tenants;
CREATE TRIGGER tenants_set_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS workflows_set_updated_at ON workflows;
CREATE TRIGGER workflows_set_updated_at BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS schedules_set_updated_at ON schedules;
CREATE TRIGGER schedules_set_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
