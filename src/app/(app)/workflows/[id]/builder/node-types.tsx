"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

export type NodeCatalogItem = {
  type: string;
  label: string;
  color: string;
  defaults: Record<string, unknown>;
  handles?: { in?: boolean; out?: string[] };
};

export const NODE_CATALOG: NodeCatalogItem[] = [
  { type: "trigger", label: "Trigger", color: "#6366f1", defaults: { triggerType: "manual" }, handles: { out: ["out"] } },
  { type: "schedule_trigger", label: "Schedule trigger", color: "#6366f1", defaults: { triggerType: "schedule" }, handles: { out: ["out"] } },
  { type: "webhook_trigger", label: "Webhook trigger", color: "#6366f1", defaults: { triggerType: "webhook" }, handles: { out: ["out"] } },
  { type: "api_trigger", label: "API trigger", color: "#6366f1", defaults: { triggerType: "api" }, handles: { out: ["out"] } },
  { type: "http_request", label: "HTTP request", color: "#0ea5e9", defaults: { method: "POST", url: "", body: {} } },
  { type: "webhook", label: "Webhook", color: "#0ea5e9", defaults: { method: "POST", url: "", body: {} } },
  { type: "delay", label: "Delay", color: "#f59e0b", defaults: { seconds: 5 } },
  {
    type: "condition",
    label: "Condition",
    color: "#ef4444",
    defaults: { expression: "$input.value > 0" },
    handles: { in: true, out: ["true", "false"] },
  },
  { type: "parallel", label: "Parallel split", color: "#8b5cf6", defaults: {} },
  { type: "merge", label: "Merge", color: "#8b5cf6", defaults: {} },
  { type: "transform", label: "Transform", color: "#14b8a6", defaults: { template: "" } },
  { type: "send_email", label: "Send email", color: "#10b981", defaults: { title: "", message: "" } },
  { type: "send_notification", label: "Send notification", color: "#10b981", defaults: { title: "", message: "", channels: ["in_app", "push"] } },
  { type: "approval", label: "Approval", color: "#f97316", defaults: {} },
  { type: "database_action", label: "Database action", color: "#64748b", defaults: {} },
  { type: "ai_agent", label: "AI agent", color: "#ec4899", defaults: { agentId: "" } },
  { type: "end", label: "End", color: "#475569", defaults: {} },
];

function CatalogCard({ data }: NodeProps) {
  const nodeType = ((data as Record<string, unknown>)?.nodeType as string) ?? "custom";
  const item = NODE_CATALOG.find((c) => c.type === nodeType);
  const label = ((data as Record<string, unknown>)?.label as string) ?? item?.label ?? nodeType;
  const color = item?.color ?? "#6366f1";
  const outs = item?.handles?.out ?? ["out"];
  const showIn = item?.handles?.in ?? !nodeType.includes("trigger");

  return (
    <div
      className="rf-node-card w-[220px] rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)/0.96))] shadow-[0_18px_40px_-28px_rgb(15_23_42_/_0.28)] backdrop-blur dark:border-white/10 dark:bg-[linear-gradient(180deg,hsl(223_24%_15%),hsl(224_26%_12%))]"
      style={{ boxShadow: `0 18px 40px -28px ${color}55, inset 0 1px 0 ${color}22` }}
    >
      {showIn ? (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !border-2 !border-card !bg-primary"
        />
      ) : null}
      <div className="flex items-start gap-3 px-4 py-3 dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_40%)]">
        <div
          className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 0 4px ${color}20, 0 0 18px ${color}30` }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground dark:text-white/50">
          {nodeType.replace(/_/g, " ")}
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-foreground dark:text-white">{label}</div>
        </div>
      </div>
      {outs.map((h, i) => (
        <Handle
          key={h}
          id={h}
          type="source"
          position={Position.Right}
          style={{ top: `${34 + i * 20}px` }}
          className="!h-2.5 !w-2.5 !border-2 !border-card !bg-primary"
        />
      ))}
      {outs.length > 1 ? (
        <div className="flex gap-2 px-4 pb-3 text-[10px] text-muted-foreground dark:text-white/55">
          {outs.map((h) => (
            <span key={h} className="rounded-full bg-muted px-2 py-0.5 capitalize dark:bg-white/8">
              {h}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const NodeCardMemo = memo(CatalogCard);
