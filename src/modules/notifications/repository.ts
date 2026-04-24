import { query, queryOne, queryRows, withTransaction } from "@/lib/db";

export type InAppNotificationRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  workflow_run_id: string | null;
  node_id: string | null;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  disabled_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export async function createInAppNotificationsForTenant(input: {
  tenantId: string;
  workflowRunId: string;
  nodeId: string;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
}): Promise<number> {
  const result = await query<{ count: string }>(
    `WITH recipients AS (
       SELECT DISTINCT m.user_id
         FROM tenant_memberships m
        WHERE m.tenant_id = $1
     ), inserted AS (
       INSERT INTO in_app_notifications
         (tenant_id, user_id, workflow_run_id, node_id, title, message, payload)
       SELECT $1, r.user_id, $2, $3, $4, $5, $6::jsonb
         FROM recipients r
       RETURNING 1
     )
     SELECT COUNT(*)::text AS count FROM inserted`,
    [
      input.tenantId,
      input.workflowRunId,
      input.nodeId,
      input.title,
      input.message,
      JSON.stringify(input.payload ?? {}),
    ],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function listUserNotifications(input: {
  tenantId: string;
  userId: string;
  limit?: number;
  offset?: number;
}): Promise<InAppNotificationRow[]> {
  return queryRows<InAppNotificationRow>(
    `SELECT *
       FROM in_app_notifications
      WHERE tenant_id = $1 AND user_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4`,
    [input.tenantId, input.userId, input.limit ?? 50, input.offset ?? 0],
  );
}

export async function countUserNotifications(input: {
  tenantId: string;
  userId: string;
}): Promise<number> {
  const r = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM in_app_notifications
      WHERE tenant_id = $1 AND user_id = $2`,
    [input.tenantId, input.userId],
  );
  return Number(r?.count ?? 0);
}

export async function unreadNotificationCount(input: {
  tenantId: string;
  userId: string;
}): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM in_app_notifications
      WHERE tenant_id = $1
        AND user_id = $2
        AND read_at IS NULL`,
    [input.tenantId, input.userId],
  );
  return Number(row?.count ?? 0);
}

export async function markNotificationRead(input: {
  tenantId: string;
  userId: string;
  notificationId: string;
}): Promise<void> {
  await query(
    `UPDATE in_app_notifications
        SET read_at = COALESCE(read_at, now())
      WHERE tenant_id = $1 AND user_id = $2 AND id = $3`,
    [input.tenantId, input.userId, input.notificationId],
  );
}

export async function markAllNotificationsRead(input: {
  tenantId: string;
  userId: string;
}): Promise<void> {
  await query(
    `UPDATE in_app_notifications
        SET read_at = COALESCE(read_at, now())
      WHERE tenant_id = $1
        AND user_id = $2
        AND read_at IS NULL`,
    [input.tenantId, input.userId],
  );
}

export async function upsertPushSubscription(input: {
  tenantId: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO push_subscriptions
       (tenant_id, user_id, endpoint, p256dh, auth, user_agent, disabled_at, last_error)
     VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)
     ON CONFLICT (endpoint)
     DO UPDATE SET
       tenant_id = EXCLUDED.tenant_id,
       user_id = EXCLUDED.user_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       user_agent = EXCLUDED.user_agent,
       disabled_at = NULL,
       last_error = NULL`,
    [
      input.tenantId,
      input.userId,
      input.endpoint,
      input.p256dh,
      input.auth,
      input.userAgent,
    ],
  );
}

export async function disablePushSubscription(input: {
  tenantId: string;
  userId: string;
  endpoint: string;
}): Promise<void> {
  await query(
    `UPDATE push_subscriptions
        SET disabled_at = now()
      WHERE tenant_id = $1 AND user_id = $2 AND endpoint = $3`,
    [input.tenantId, input.userId, input.endpoint],
  );
}

export async function listActivePushSubscriptions(tenantId: string): Promise<PushSubscriptionRow[]> {
  return queryRows<PushSubscriptionRow>(
    `SELECT *
       FROM push_subscriptions
      WHERE tenant_id = $1
        AND disabled_at IS NULL`,
    [tenantId],
  );
}

export async function recordPushDelivery(input: {
  tenantId: string;
  workflowRunId: string;
  nodeId: string;
  subscriptionId: string | null;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  status: "queued" | "delivered" | "failed" | "skipped";
  errorMessage?: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO push_notification_deliveries
       (tenant_id, workflow_run_id, subscription_id, node_id, title, message, payload, status, error_message, delivered_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, CASE WHEN $8 = 'delivered' THEN now() ELSE NULL END)`,
    [
      input.tenantId,
      input.workflowRunId,
      input.subscriptionId,
      input.nodeId,
      input.title,
      input.message,
      JSON.stringify(input.payload ?? {}),
      input.status,
      input.errorMessage ?? null,
    ],
  );
}

export async function markPushSubscriptionResult(input: {
  subscriptionId: string;
  ok: boolean;
  errorMessage?: string | null;
}): Promise<void> {
  await query(
    `UPDATE push_subscriptions
        SET last_success_at = CASE WHEN $2 THEN now() ELSE last_success_at END,
            last_failure_at = CASE WHEN NOT $2 THEN now() ELSE last_failure_at END,
            last_error = CASE WHEN NOT $2 THEN $3 ELSE NULL END,
            disabled_at = CASE WHEN NOT $2 AND $3 ILIKE '%410%' THEN now() ELSE disabled_at END
      WHERE id = $1`,
    [input.subscriptionId, input.ok, input.errorMessage ?? null],
  );
}