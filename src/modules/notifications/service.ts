import webpush, { type PushSubscription } from "web-push";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  createInAppNotificationsForTenant,
  listActivePushSubscriptions,
  markPushSubscriptionResult,
  recordPushDelivery,
} from "./repository";

let vapidConfigured = false;

function ensureWebPushConfigured() {
  if (vapidConfigured) return true;
  if (!env.PUSH_VAPID_PUBLIC_KEY || !env.PUSH_VAPID_PRIVATE_KEY || !env.PUSH_VAPID_SUBJECT) {
    return false;
  }
  webpush.setVapidDetails(
    env.PUSH_VAPID_SUBJECT,
    env.PUSH_VAPID_PUBLIC_KEY,
    env.PUSH_VAPID_PRIVATE_KEY,
  );
  vapidConfigured = true;
  return true;
}

export async function sendWorkflowNotification(input: {
  tenantId: string;
  workflowRunId: string;
  nodeId: string;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  channels?: string[];
}) {
  const channels = normalizeChannels(input.channels);
  let inAppCount = 0;
  let pushCount = 0;
  let pushSkipped = 0;

  if (channels.includes("in_app")) {
    inAppCount = await createInAppNotificationsForTenant({
      tenantId: input.tenantId,
      workflowRunId: input.workflowRunId,
      nodeId: input.nodeId,
      title: input.title,
      message: input.message,
      payload: input.payload,
    });
  }

  if (channels.includes("push")) {
    const subscriptions = await listActivePushSubscriptions(input.tenantId);
    if (!subscriptions.length) {
      pushSkipped = 1;
      await recordPushDelivery({
        tenantId: input.tenantId,
        workflowRunId: input.workflowRunId,
        nodeId: input.nodeId,
        subscriptionId: null,
        title: input.title,
        message: input.message,
        payload: input.payload,
        status: "skipped",
        errorMessage: "No active push subscriptions",
      });
    } else if (!ensureWebPushConfigured()) {
      pushSkipped = subscriptions.length;
      for (const subscription of subscriptions) {
        await recordPushDelivery({
          tenantId: input.tenantId,
          workflowRunId: input.workflowRunId,
          nodeId: input.nodeId,
          subscriptionId: subscription.id,
          title: input.title,
          message: input.message,
          payload: input.payload,
          status: "skipped",
          errorMessage: "Push VAPID env vars are not configured",
        });
      }
    } else {
      const payload = JSON.stringify({
        title: input.title,
        body: input.message,
        data: input.payload ?? {},
      });
      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            } as PushSubscription,
            payload,
          );
          pushCount += 1;
          await recordPushDelivery({
            tenantId: input.tenantId,
            workflowRunId: input.workflowRunId,
            nodeId: input.nodeId,
            subscriptionId: subscription.id,
            title: input.title,
            message: input.message,
            payload: input.payload,
            status: "delivered",
          });
          await markPushSubscriptionResult({ subscriptionId: subscription.id, ok: true });
        } catch (error) {
          const message = (error as Error).message;
          logger.warn({ err: error, subscriptionId: subscription.id }, "push delivery failed");
          await recordPushDelivery({
            tenantId: input.tenantId,
            workflowRunId: input.workflowRunId,
            nodeId: input.nodeId,
            subscriptionId: subscription.id,
            title: input.title,
            message: input.message,
            payload: input.payload,
            status: "failed",
            errorMessage: message,
          });
          await markPushSubscriptionResult({
            subscriptionId: subscription.id,
            ok: false,
            errorMessage: message,
          });
        }
      }
    }
  }

  return {
    channels,
    inAppCount,
    pushCount,
    pushSkipped,
  };
}

function normalizeChannels(channels?: string[]) {
  const values = new Set(
    (channels?.length ? channels : ["in_app", "push"])
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean),
  );
  const normalized = [...values].filter((value) => value === "in_app" || value === "push");
  return normalized.length ? normalized : ["in_app", "push"];
}