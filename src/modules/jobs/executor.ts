import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  createStepRun,
  finishStepRun,
} from "@/modules/executions/repository";
import { sendWorkflowNotification } from "@/modules/notifications/service";
import type { WorkflowDefinition, WorkflowNode } from "@/modules/workflows/graph";

export type ExecutionContext = {
  tenantId: string;
  workflowRunId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
};

type ExecutorResult =
  | { ok: true; output: Record<string, unknown>; nextHandle?: string | null }
  | { ok: false; error: string };

export async function runWorkflow(
  definition: WorkflowDefinition,
  ctx: ExecutionContext,
): Promise<{ success: boolean; error: string | null }> {
  const byId = new Map(definition.nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, { target: string; handle: string | null }[]>();
  for (const e of definition.edges) {
    const list = outgoing.get(e.source) ?? [];
    list.push({ target: e.target, handle: e.sourceHandle ?? null });
    outgoing.set(e.source, list);
  }

  const start = definition.nodes.find((n) =>
    ["trigger", "schedule_trigger", "webhook_trigger", "api_trigger"].includes(
      n.type,
    ),
  );
  if (!start) return { success: false, error: "No trigger node" };

  const visited = new Set<string>();
  const queue: { nodeId: string; input: Record<string, unknown> }[] = [
    { nodeId: start.id, input: ctx.input },
  ];

  while (queue.length) {
    const { nodeId, input } = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    const node = byId.get(nodeId);
    if (!node) continue;

    const step = await createStepRun({
      tenantId: ctx.tenantId,
      workflowRunId: ctx.workflowRunId,
      nodeId: node.id,
      nodeType: node.type,
      input,
    });

    let result: ExecutorResult;
    try {
      result = await executeNode(node, input, ctx);
    } catch (err) {
      result = { ok: false, error: (err as Error).message };
    }

    if (!result.ok) {
      await finishStepRun(step.id, "failed", null, result.error);
      return { success: false, error: `Node ${node.id}: ${result.error}` };
    }
    await finishStepRun(step.id, "success", result.output, null);

    const mergedOutput = { ...input, [`$${node.id}`]: result.output };
    const edges = outgoing.get(node.id) ?? [];
    const filtered =
      node.type === "condition" && result.nextHandle
        ? edges.filter((e) => e.handle === result.nextHandle)
        : edges;

    for (const e of filtered) queue.push({ nodeId: e.target, input: mergedOutput });
  }

  return { success: true, error: null };
}

async function executeNode(
  node: WorkflowNode,
  input: Record<string, unknown>,
  ctx: ExecutionContext,
): Promise<ExecutorResult> {
  const data = node.data ?? {};
  switch (node.type) {
    case "trigger":
    case "schedule_trigger":
    case "webhook_trigger":
    case "api_trigger":
      return { ok: true, output: { trigger: data.triggerType ?? "manual" } };
    case "http_request":
    case "webhook":
      return execHttp(data, input);
    case "delay":
      return execDelay(data);
    case "condition":
      return execCondition(data, input);
    case "transform":
      return { ok: true, output: { value: data.template ?? null } };
    case "send_email":
      logger.info({ node: node.id, data }, "email simulated");
      return { ok: true, output: { sent: true } };
    case "send_notification":
      return execNotification(node, data, input, ctx);
    case "approval":
      return { ok: true, output: { approved: true, auto: true } };
    case "database_action":
      return { ok: true, output: { executed: true } };
    case "ai_agent":
      return { ok: true, output: { agent: data.agentId ?? "unspecified" } };
    case "parallel":
    case "merge":
    case "end":
      return { ok: true, output: {} };
    default:
      return { ok: true, output: { skipped: node.type } };
  }
}

async function execNotification(
  node: WorkflowNode,
  data: Record<string, unknown>,
  input: Record<string, unknown>,
  ctx: ExecutionContext,
): Promise<ExecutorResult> {
  const title = String(data.title ?? "Workflow notification").trim() || "Workflow notification";
  const message = String(data.message ?? "").trim() || `Workflow step ${node.id} completed.`;
  const rawChannels = Array.isArray(data.channels)
    ? (data.channels as unknown[]).map((value) => String(value))
    : undefined;
  const result = await sendWorkflowNotification({
    tenantId: ctx.tenantId,
    workflowRunId: ctx.workflowRunId,
    nodeId: node.id,
    title,
    message,
    payload: {
      ...ctx.output,
      ...input,
      workflowRunId: ctx.workflowRunId,
      nodeId: node.id,
      url: `${env.APP_URL}/notifications`,
    },
    channels: rawChannels,
  });
  return { ok: true, output: { sent: true, ...result } };
}

async function execHttp(
  data: Record<string, unknown>,
  input: Record<string, unknown>,
): Promise<ExecutorResult> {
  const url = String(data.url ?? "");
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: "Invalid URL" };
  const method = String(data.method ?? "POST").toUpperCase();
  const headers = (data.headers as Record<string, string> | undefined) ?? {
    "content-type": "application/json",
  };
  const bodyPayload = data.body ?? input;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : JSON.stringify(bodyPayload),
      signal: controller.signal,
    });
    const text = await res.text().catch(() => "");
    return {
      ok: res.ok,
      output: {
        status: res.status,
        body: text.slice(0, 2000),
      },
      ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
    } as ExecutorResult;
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

async function execDelay(data: Record<string, unknown>): Promise<ExecutorResult> {
  const seconds = Math.max(0, Math.min(30, Number(data.seconds ?? 1)));
  await new Promise((r) => setTimeout(r, seconds * 1000));
  return { ok: true, output: { waited: seconds } };
}

function execCondition(
  data: Record<string, unknown>,
  input: Record<string, unknown>,
): ExecutorResult {
  try {
    const expr = String(data.expression ?? "true");
    const fn = new Function("$input", `return (${expr});`);
    const result = Boolean(fn(input));
    return { ok: true, output: { result }, nextHandle: result ? "true" : "false" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
