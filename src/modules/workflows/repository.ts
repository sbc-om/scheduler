import { createHash } from "node:crypto";
import { queryOne, queryRows, withTransaction } from "@/lib/db";
import {
  EMPTY_WORKFLOW,
  WorkflowDefinitionSchema,
  validateWorkflowGraph,
  type WorkflowDefinition,
} from "./graph";

export type WorkflowRow = {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  latest_version_number: number;
  published_version_id: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkflowVersionRow = {
  id: string;
  workflow_id: string;
  tenant_id: string;
  version_number: number;
  status: "draft" | "published" | "retired";
  trigger_type: string;
  definition: WorkflowDefinition;
  checksum: string;
  created_at: string;
};

function checksumOf(def: WorkflowDefinition): string {
  return createHash("sha256").update(JSON.stringify(def)).digest("hex");
}

export async function listWorkflows(
  tenantId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<WorkflowRow[]> {
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;
  return queryRows<WorkflowRow>(
    `SELECT * FROM workflows
      WHERE tenant_id = $1
      ORDER BY updated_at DESC
      LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
}

export async function countWorkflows(tenantId: string): Promise<number> {
  const r = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM workflows WHERE tenant_id = $1`,
    [tenantId],
  );
  return Number(r?.count ?? 0);
}

export async function getWorkflow(
  tenantId: string,
  id: string,
): Promise<WorkflowRow | null> {
  return queryOne<WorkflowRow>(
    `SELECT * FROM workflows WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
}

export async function getDraftVersion(
  tenantId: string,
  workflowId: string,
): Promise<WorkflowVersionRow | null> {
  return queryOne<WorkflowVersionRow>(
    `SELECT * FROM workflow_versions
      WHERE tenant_id = $1 AND workflow_id = $2 AND status = 'draft'
      ORDER BY version_number DESC LIMIT 1`,
    [tenantId, workflowId],
  );
}

export async function getLatestVersion(
  tenantId: string,
  workflowId: string,
): Promise<WorkflowVersionRow | null> {
  return queryOne<WorkflowVersionRow>(
    `SELECT * FROM workflow_versions
      WHERE tenant_id = $1 AND workflow_id = $2
      ORDER BY version_number DESC LIMIT 1`,
    [tenantId, workflowId],
  );
}

export async function getPublishedVersion(
  tenantId: string,
  workflowId: string,
): Promise<WorkflowVersionRow | null> {
  return queryOne<WorkflowVersionRow>(
    `SELECT v.* FROM workflows w
       JOIN workflow_versions v ON v.id = w.published_version_id
      WHERE w.tenant_id = $1 AND w.id = $2`,
    [tenantId, workflowId],
  );
}

export async function getVersionById(
  tenantId: string,
  versionId: string,
): Promise<WorkflowVersionRow | null> {
  return queryOne<WorkflowVersionRow>(
    `SELECT * FROM workflow_versions WHERE tenant_id = $1 AND id = $2`,
    [tenantId, versionId],
  );
}

export async function createWorkflow(input: {
  tenantId: string;
  code: string;
  name: string;
  description?: string | null;
  createdBy: string | null;
}): Promise<{ workflow: WorkflowRow; version: WorkflowVersionRow }> {
  return withTransaction(async (client) => {
    const w = await client.query<WorkflowRow>(
      `INSERT INTO workflows (tenant_id, code, name, description, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        input.tenantId,
        input.code,
        input.name,
        input.description ?? null,
        input.createdBy,
      ],
    );
    const def = EMPTY_WORKFLOW;
    const v = await client.query<WorkflowVersionRow>(
      `INSERT INTO workflow_versions
         (workflow_id, tenant_id, version_number, status, trigger_type, definition, checksum, created_by)
       VALUES ($1, $2, 1, 'draft', 'manual', $3::jsonb, $4, $5)
       RETURNING *`,
      [
        w.rows[0].id,
        input.tenantId,
        JSON.stringify(def),
        checksumOf(def),
        input.createdBy,
      ],
    );
    return { workflow: w.rows[0], version: v.rows[0] };
  });
}

export async function saveBuilderDraft(input: {
  tenantId: string;
  workflowId: string;
  definition: WorkflowDefinition;
  createdBy: string | null;
}): Promise<WorkflowVersionRow> {
  const parsed = WorkflowDefinitionSchema.parse(input.definition);
  return withTransaction(async (client) => {
    const existing = await client.query<WorkflowVersionRow>(
      `SELECT * FROM workflow_versions
        WHERE tenant_id = $1 AND workflow_id = $2 AND status = 'draft'
        ORDER BY version_number DESC LIMIT 1`,
      [input.tenantId, input.workflowId],
    );
    const checksum = checksumOf(parsed);
    const triggerType =
      parsed.nodes.find((n) => n.type.includes("trigger"))?.data?.triggerType ??
      "manual";
    if (existing.rows[0]) {
      const r = await client.query<WorkflowVersionRow>(
        `UPDATE workflow_versions
            SET definition = $1::jsonb,
                checksum = $2,
                trigger_type = $3
          WHERE id = $4
        RETURNING *`,
        [JSON.stringify(parsed), checksum, String(triggerType), existing.rows[0].id],
      );
      return r.rows[0];
    }
    const latest = await client.query<{ max: number | null }>(
      `SELECT MAX(version_number) AS max FROM workflow_versions WHERE workflow_id = $1`,
      [input.workflowId],
    );
    const nextVer = (latest.rows[0]?.max ?? 0) + 1;
    const r = await client.query<WorkflowVersionRow>(
      `INSERT INTO workflow_versions
         (workflow_id, tenant_id, version_number, status, trigger_type, definition, checksum, created_by)
       VALUES ($1, $2, $3, 'draft', $4, $5::jsonb, $6, $7)
       RETURNING *`,
      [
        input.workflowId,
        input.tenantId,
        nextVer,
        String(triggerType),
        JSON.stringify(parsed),
        checksum,
        input.createdBy,
      ],
    );
    await client.query(
      `UPDATE workflows SET latest_version_number = $1 WHERE id = $2`,
      [nextVer, input.workflowId],
    );
    return r.rows[0];
  });
}

export async function publishWorkflow(input: {
  tenantId: string;
  workflowId: string;
}): Promise<WorkflowVersionRow> {
  return withTransaction(async (client) => {
    const draft = await client.query<WorkflowVersionRow>(
      `SELECT * FROM workflow_versions
        WHERE tenant_id = $1 AND workflow_id = $2 AND status = 'draft'
        ORDER BY version_number DESC LIMIT 1`,
      [input.tenantId, input.workflowId],
    );
    if (!draft.rows[0]) throw new Error("No draft version to publish");
    const errors = validateWorkflowGraph(draft.rows[0].definition);
    if (errors.length) throw new Error(`Validation failed: ${errors.join(", ")}`);
    const r = await client.query<WorkflowVersionRow>(
      `UPDATE workflow_versions
          SET status = 'published'
        WHERE id = $1
      RETURNING *`,
      [draft.rows[0].id],
    );
    await client.query(
      `UPDATE workflow_versions SET status = 'retired'
        WHERE workflow_id = $1 AND status = 'published' AND id <> $2`,
      [input.workflowId, r.rows[0].id],
    );
    await client.query(
      `UPDATE workflows
          SET status = 'published',
              published_version_id = $1
        WHERE id = $2`,
      [r.rows[0].id, input.workflowId],
    );
    return r.rows[0];
  });
}
