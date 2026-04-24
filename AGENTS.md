# Advanced Multi-Tenant Scheduler Platform

## Product Vision

Build an enterprise-grade, multi-tenant scheduler and workflow automation platform that is stronger than a simple cron manager.

The platform must support reliable job orchestration, advanced workflow composition, strict tenant isolation, raw PostgreSQL access, strong observability, and a premium SaaS-grade user experience.

This is not a basic cron dashboard. It is a scheduling and workflow control plane for serious production workloads.

---

## Non-Negotiable Technical Decisions

The implementation must follow these rules:

- Use PostgreSQL as the primary system of record.
- Use the `pg` driver and raw SQL for all database access.
- Do not use Prisma, Drizzle, TypeORM, Sequelize, or any ORM.
- Do not use Redis as the primary scheduling backbone.
- Do not use BullMQ as the core scheduler.
- Use a PostgreSQL-native job scheduler and queue system.
- Recommended scheduler: `pg-boss`.
- Cron expressions may be supported as a user-facing schedule format, but cron itself must never be the execution backbone.

Rationale:

- Raw SQL gives tighter control over query plans, indexes, locking, and multi-tenant isolation.
- A PostgreSQL-native scheduler reduces operational sprawl and keeps scheduling state transactional.
- `pg-boss` provides delayed jobs, retries, dead-letter handling, priorities, and recurring scheduling on top of PostgreSQL, which is a better fit for this platform than a basic cron service.

---

## Target Outcome

The final product should feel like a modern automation platform with the reliability of a scheduler, the flexibility of a workflow builder, and the polish of a premium SaaS application.

It must be:

- Multi-tenant
- API-first
- Workflow-centric
- Highly observable
- Secure by default
- Production-grade
- Ready for future AI-agent execution

---

## Primary Tech Stack

- Frontend: Next.js App Router, TypeScript
- UI: Tailwind CSS, Radix UI primitives, shadcn-style component architecture
- Workflow Builder: React Flow for node-edge orchestration, `@dnd-kit` for advanced drag interactions
- Backend HTTP Layer: Next.js Route Handlers
- Database Driver: `pg`
- Database: PostgreSQL
- Scheduler / Queue Backbone: `pg-boss`
- Validation: Zod
- Auth: Better Auth or custom JWT/session architecture
- Logging: Pino
- Telemetry: OpenTelemetry-ready instrumentation
- Testing: Vitest for unit tests, Playwright for end-to-end flows
- Deployment: Docker Compose for local development, container-ready production setup

---

## Core Product Capabilities

The platform must support all of the following:

1. One-time scheduled jobs
2. Delayed jobs
3. Recurring schedules
4. Cron-expression schedules
5. Interval schedules
6. Timezone-aware execution
7. Run-now execution
8. Pause and resume
9. Cancellation before dispatch
10. Retry policies with backoff
11. Dead-letter handling
12. Priority-aware dispatch
13. Concurrency controls
14. Rate limiting per tenant and per endpoint
15. Idempotent execution
16. Execution history
17. Step-level workflow execution logs
18. Audit logs
19. Webhook jobs
20. Internal action jobs
21. Notification jobs
22. Database-driven task jobs
23. API-triggered jobs
24. Event-triggered workflows
25. Manual approval steps for workflows
26. Tenant-level isolation
27. Role-based access control
28. Tenant API keys
29. Usage metering
30. Health monitoring and recovery tooling

---

## Product Domains

### Tenancy

Each customer organization is a tenant.

Rules:

- Every tenant-owned row must include `tenant_id`.
- Cross-tenant reads and writes are forbidden.
- Global tables must be rare and explicit.
- Tenant isolation must be enforced both in application code and, where practical, with PostgreSQL Row Level Security.

### Schedules

A schedule decides when work becomes eligible for dispatch.

Supported schedule types:

```ts
type ScheduleType =
  | "once"
  | "delayed"
  | "cron"
  | "interval"
  | "rrule"
  | "manual"
  | "event";
```

Notes:

- `cron` is a supported expression format.
- `rrule` is recommended for more advanced recurring calendar logic.
- `event` schedules allow workflows to be triggered from APIs or domain events.

### Jobs

A job is a dispatchable unit of execution.

Supported job types:

- `webhook`
- `email`
- `sms`
- `internal_api`
- `database_task`
- `report`
- `approval`
- `transform`
- `delay`
- `condition`
- `ai_agent`
- `custom`

### Workflows

A workflow is a directed graph of nodes and edges.

Workflows must support:

- Trigger nodes
- Action nodes
- Delay nodes
- Conditional branches
- Parallel branches
- Merge nodes
- Approval nodes
- Retry policies per node
- Failure paths
- Versioning
- Draft and published states

### Executions

Every job run and every workflow run must create immutable execution records.

```ts
type ExecutionStatus =
  | "queued"
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "retrying"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "dead_lettered"
  | "expired";
```

---

## Architecture Principles

### 1. PostgreSQL-Centric Design

PostgreSQL is not only the database. It is the consistency anchor for schedules, workflow definitions, dispatch state, audit data, and execution history.

Use:

- Raw SQL queries via `pg`
- Explicit transactions
- `FOR UPDATE SKIP LOCKED` where appropriate
- Partial indexes for active schedules and pending executions
- Advisory locks only when truly needed
- JSONB for flexible payloads, not for core relational boundaries

### 2. Separate Web and Worker Runtime

Do not execute scheduling logic or long-running jobs inside request handlers.

Use separate processes:

```txt
web-app
scheduler-worker
execution-worker
postgres
```

### 3. Transactional Dispatch

Schedule state updates and queue handoff must be coordinated safely.

Preferred model:

- Persist schedule and workflow state in PostgreSQL.
- Enqueue due work through `pg-boss`.
- Record execution rows before actual work begins.
- Update final execution state atomically after each attempt.

### 4. Versioned Workflows

Workflow definitions must be versioned.

Rules:

- Editing a published workflow creates a new draft version.
- Active executions continue on the version they started with.
- Published versions are immutable.

---

## Recommended Runtime Design

### Web Application Responsibilities

- Authentication and authorization
- Tenant-aware APIs
- Workflow builder UI
- Schedule management UI
- API key management
- Execution history and observability views
- Admin and tenant dashboards

### Scheduler Worker Responsibilities

- Register recurring schedules with `pg-boss`
- Dispatch due jobs
- Resolve workflow entry triggers
- Enforce concurrency and tenant throttles
- Recover stale queued work

### Execution Worker Responsibilities

- Consume queued jobs from `pg-boss`
- Execute workflow nodes
- Execute webhook, API, and internal tasks
- Apply retry and timeout rules
- Write logs and attempt records
- Move terminal failures to dead-letter state

---

## Database Access Rules

Use raw SQL only.

Mandatory rules:

- Every query must be parameterized.
- No string interpolation for SQL values.
- Shared query helpers should be thin and explicit.
- Complex reads should live in dedicated repository functions.
- Schema changes must be plain SQL migration files.
- Performance-critical queries must be reviewed with indexes and explain plans.

Example query style:

```ts
const result = await db.query(
  `
    SELECT id, tenant_id, status, next_run_at
    FROM schedules
    WHERE tenant_id = $1
      AND status = 'active'
    ORDER BY next_run_at ASC
    LIMIT $2
  `,
  [tenantId, limit]
);
```

---

## Recommended Database Schema

Use the following as the minimum serious production schema.

### tenants

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  plan_code TEXT NOT NULL DEFAULT 'pro',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'suspended', 'disabled'))
);
```

### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'invited', 'disabled'))
);
```

### tenant_memberships

```sql
CREATE TABLE tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id),
  CHECK (role IN ('owner', 'admin', 'operator', 'viewer'))
);
```

### api_keys

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX api_keys_tenant_idx ON api_keys (tenant_id);
```

### workflows

```sql
CREATE TABLE workflows (
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
```

### workflow_versions

```sql
CREATE TABLE workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  trigger_type TEXT NOT NULL,
  definition JSONB NOT NULL,
  checksum TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, version_number),
  CHECK (status IN ('draft', 'published', 'retired'))
);
```

### schedules

```sql
CREATE TABLE schedules (
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

CREATE INDEX schedules_due_idx
  ON schedules (tenant_id, next_run_at)
  WHERE status = 'active';
```

### workflow_runs

```sql
CREATE TABLE workflow_runs (
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

CREATE INDEX workflow_runs_tenant_created_idx
  ON workflow_runs (tenant_id, created_at DESC);
```

### workflow_step_runs

```sql
CREATE TABLE workflow_step_runs (
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

CREATE INDEX workflow_step_runs_run_idx
  ON workflow_step_runs (workflow_run_id, created_at ASC);
```

### job_executions

```sql
CREATE TABLE job_executions (
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
```

### audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id),
  actor_type TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  ip_address INET,
  user_agent TEXT,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_tenant_created_idx ON audit_logs (tenant_id, created_at DESC);
```

---

## Scheduler Design

### Core Rule

The system must use `pg-boss` as the scheduling and job dispatch backbone.

`pg-boss` should be responsible for:

- Delayed jobs
- Retries
- Dead-letter behavior
- Priorities
- Worker queueing
- Recurring schedule registration where appropriate

Application tables remain the source of truth for:

- Tenant ownership
- Workflow definitions
- Published schedule configuration
- Execution audit trail
- UI state and analytics

### Why This Is Stronger Than Cron

Cron only answers one question: when should a command start.

This platform must also handle:

- retries
- dead-lettering
- tenant-aware throttling
- distributed workers
- idempotency
- execution history
- workflow branching
- pause and resume
- manual re-run
- visibility and auditability

That is why the architecture must be job-scheduler driven, not cron-driven.

---

## Scheduling Semantics

Rules:

- One-time schedules run once and then become `completed`.
- Delayed jobs run after a specific future timestamp.
- Cron schedules must respect tenant timezone.
- RRULE schedules must support advanced recurring calendar logic.
- Interval schedules compute the next run from the dispatch policy, not from UI assumptions.
- Paused schedules never dispatch.
- Cancelled schedules never dispatch.
- Expired schedules never dispatch.
- Disabled workflow versions never dispatch.
- Duplicate dispatch must be blocked with idempotency keys and execution uniqueness constraints.

---

## Workflow Builder Requirements

The platform must include a professional drag-and-drop workflow builder.

### Builder Capabilities

- Canvas-based graph editor
- Drag-and-drop node placement
- Edge connections between nodes
- Auto-layout option
- Snap grid and alignment guides
- Node grouping for complex flows
- Branching conditions
- Delays and wait states
- Retry and timeout configuration per node
- Draft and publish lifecycle
- Version comparison
- Validation before publish
- Execution replay visualization

### Minimum Node Types

- Trigger
- Schedule Trigger
- Webhook Trigger
- API Trigger
- Condition
- Delay
- Parallel Split
- Merge
- HTTP Request
- Internal Action
- Database Action
- Send Email
- Send Notification
- Approval
- Transform Data
- AI Agent
- End

### Builder UX Standards

- Fast interactions with low visual latency
- Keyboard shortcuts for common actions
- Multi-select and bulk move
- Context panel for node configuration
- Undo and redo
- Edge labels for branch semantics
- Dirty-state tracking
- Publish diff summary
- Read-only execution overlay for historical runs

---

## UI and UX Direction

The user interface must look premium, modern, and operationally trustworthy.

This is a professional control surface, not a template-grade admin panel.

### UX Principles

- Information-dense without feeling cramped
- Strong visual hierarchy
- Fast scanability for operational states
- Clear separation between configuration and live runtime data
- Excellent empty states and error states
- Mobile-friendly for monitoring, desktop-optimized for authoring workflows

### Design Direction

- Clean, high-contrast layout
- Refined spacing and typography
- Rich status colors with disciplined usage
- Subtle motion for state transitions
- Advanced data tables with filters and saved views
- Clear runtime badges for queued, running, failed, paused, and healthy states

### Core Screens

```txt
/dashboard
/workflows
/workflows/new
/workflows/[id]
/workflows/[id]/builder
/schedules
/schedules/new
/schedules/[id]
/executions
/executions/[id]
/api-keys
/settings
/settings/team
/settings/usage
```

### Dashboard Requirements

The dashboard should show:

- Workflow health summary
- Upcoming scheduled runs
- Failed executions needing attention
- Throughput trend
- Success rate trend
- Queue depth
- Worker health
- Tenant usage against plan limits

### Workflow List Requirements

Each row or card should show:

- Workflow name
- Published version
- Trigger type
- Status
- Last run
- Next run
- Success rate
- Avg duration
- Quick actions

### Execution Detail Requirements

Each execution detail view should show:

- Overall status
- Trigger source
- Timeline of steps
- Attempt history
- Request and response metadata
- Masked secrets
- Logs
- Duration metrics
- Retry history
- Dead-letter details if applicable

---

## API Surface

Use clean, tenant-aware REST APIs.

### Workflow APIs

```txt
GET    /api/workflows
POST   /api/workflows
GET    /api/workflows/:id
PATCH  /api/workflows/:id
POST   /api/workflows/:id/publish
POST   /api/workflows/:id/archive
GET    /api/workflows/:id/versions
POST   /api/workflows/:id/duplicate
```

### Workflow Builder APIs

```txt
GET    /api/workflows/:id/builder
PUT    /api/workflows/:id/builder
POST   /api/workflows/:id/validate
```

### Schedule APIs

```txt
GET    /api/schedules
POST   /api/schedules
GET    /api/schedules/:id
PATCH  /api/schedules/:id
DELETE /api/schedules/:id
POST   /api/schedules/:id/pause
POST   /api/schedules/:id/resume
POST   /api/schedules/:id/run-now
```

### Execution APIs

```txt
GET /api/executions
GET /api/executions/:id
GET /api/workflows/:id/executions
GET /api/schedules/:id/executions
```

### API Key APIs

```txt
GET    /api/api-keys
POST   /api/api-keys
DELETE /api/api-keys/:id
POST   /api/api-keys/:id/revoke
```

---

## Security Rules

The platform must be secure by default.

Mandatory controls:

- Hash API keys before storage.
- Never store raw secrets after initial creation.
- Use Zod validation on every external payload.
- Enforce tenant ownership in every query.
- Use idempotency keys for external execution requests.
- Rate-limit public APIs.
- Mask secrets in logs and UI.
- Sanitize webhook destinations.
- Prevent SSRF and internal network abuse.
- Apply explicit outbound request timeouts.
- Restrict private IP ranges unless allowlisted.
- Keep immutable audit records for sensitive changes.
- Record who published workflow versions.

---

## Webhook Execution Rules

For webhook and HTTP action nodes:

- Support `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`
- Support custom headers
- Support JSON payloads
- Support templated payload construction
- Support request timeout
- Support retries with bounded backoff
- Store response status and safe response snippets
- Mask `authorization`, `cookie`, and secret headers in logs
- Prevent redirect abuse unless explicitly enabled

Never expose secrets in frontend responses.

---

## Observability Requirements

The platform must be easy to operate in production.

Required telemetry:

- Structured logs
- Queue metrics
- Worker heartbeat
- Execution latency metrics
- Success and failure counters
- Tenant usage metrics
- Audit trail search
- Slow query visibility
- Correlation IDs across API, worker, and execution logs

---

## Code Quality Rules

- Use strict TypeScript.
- Avoid `any` unless there is no better option.
- Keep route handlers thin.
- Put business logic in services.
- Put SQL access in explicit repositories.
- Keep SQL readable and reviewed.
- Write unit tests for schedule calculation and workflow graph validation.
- Write integration tests for dispatch and execution flows.
- Write end-to-end tests for critical UI flows.

---

## Suggested Folder Structure

```txt
src/
  app/
    dashboard/
    workflows/
    schedules/
    executions/
    settings/
    api/
      workflows/
      schedules/
      executions/
      api-keys/

  components/
    data-table/
    dashboard/
    workflow-builder/
    schedules/
    executions/
    forms/

  lib/
    auth/
    db/
      pool.ts
      query.ts
      transaction.ts
    logger/
    security/
    telemetry/
    validation/

  modules/
    workflows/
      workflow.service.ts
      workflow.repository.ts
      workflow.validation.ts
      workflow-graph.ts
      workflow-versioning.ts

    schedules/
      schedule.service.ts
      schedule.repository.ts
      schedule.validation.ts
      schedule-next-run.ts

    executions/
      execution.service.ts
      execution.repository.ts

    jobs/
      job-dispatch.service.ts
      job-executor.ts
      webhook-executor.ts
      internal-action-executor.ts
      database-task-executor.ts
      ai-agent-executor.ts

    tenants/
      tenant.service.ts
      membership.service.ts

db/
  migrations/
    001_extensions.sql
    002_core_tables.sql
    003_workflows.sql
    004_indexes.sql
    005_rls.sql

worker/
  scheduler-worker.ts
  execution-worker.ts
  heartbeat-worker.ts
```

---

## Environment Variables

```env
DATABASE_URL=
APP_URL=
AUTH_SECRET=
API_KEY_SECRET=
ENCRYPTION_KEY=
WEBHOOK_TIMEOUT_MS=30000
DEFAULT_MAX_RETRIES=5
DEFAULT_RETRY_BACKOFF_SECONDS=60
PG_BOSS_SCHEMA=pgboss
```

---

## Delivery Standards

The finished system must feel like a premium automation product.

It must be:

- operationally reliable
- deeply observable
- safe for multi-tenant SaaS
- visually polished
- workflow-centric
- strong enough for enterprise scheduling and orchestration

If there is any conflict between implementation convenience and platform robustness, choose robustness.


