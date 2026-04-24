"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Grid3X3,
  Play,
  ScanSearch,
  Save,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { WorkflowDefinition } from "@/modules/workflows/graph";
import { NODE_CATALOG, NodeCardMemo } from "./node-types";

type BuilderNode = Node<{ label: string; [k: string]: unknown }>;

const NODE_TYPES = { card: NodeCardMemo };
const SNAP_GRID: [number, number] = [16, 16];
const DELETE_KEY_CODE = ["Backspace", "Delete"];
const FIT_VIEW_OPTIONS = { padding: 0.16 };
const DEFAULT_EDGE_OPTIONS = { animated: false, style: { strokeWidth: 1.5 } };
const PRO_OPTIONS = { hideAttribution: true };

function handleReactFlowError(code: string, message: string) {
  // React Flow fires a spurious "#002" warning during HMR / strict-mode
  // remounts even when nodeTypes is a stable reference. Suppress only that
  // code and forward everything else.
  if (code === "002") return;
  console.warn(`[React Flow] ${message}`);
}

export function BuilderClient({
  workflowId,
  workflowName,
  initialDefinition,
}: {
  workflowId: string;
  workflowName: string;
  initialDefinition: WorkflowDefinition;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<BuilderNode["data"]>(
    initialDefinition.nodes.map((n) => ({
      id: n.id,
      type: "card",
      position: n.position,
      data: { ...(n.data ?? {}), nodeType: n.type, label: labelOf(n.type, n.data) },
    })) as BuilderNode[],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>(
    initialDefinition.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
      label: e.label,
    })) as Edge[],
  );

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stableNodeTypes] = useState(() => NODE_TYPES);
  const [stableFitViewOptions] = useState(() => FIT_VIEW_OPTIONS);
  const [stableSnapGrid] = useState(() => SNAP_GRID);
  const [stableDeleteKeyCode] = useState(() => DELETE_KEY_CODE);
  const [stableProOptions] = useState(() => PRO_OPTIONS);
  const [stableDefaultEdgeOptions] = useState(() => DEFAULT_EDGE_OPTIONS);
  const rfRef = useRef<ReactFlowInstance | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const handleNodesChange = useCallback<typeof onNodesChange>(
    (changes) => {
      setDirty(true);
      onNodesChange(changes);
    },
    [onNodesChange],
  );

  const handleEdgesChange = useCallback<typeof onEdgesChange>(
    (changes) => {
      setDirty(true);
      onEdgesChange(changes);
    },
    [onEdgesChange],
  );

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setDirty(true);
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_e, n) => {
    setSelectedId(n.id);
  }, []);

  function updateSelectedData(patch: Record<string, unknown>) {
    if (!selectedId) return;
    setDirty(true);
    setNodes((ns) =>
      ns.map((n) =>
        n.id === selectedId
          ? {
              ...n,
              data: {
                ...n.data,
                ...patch,
                label: labelOf(
                  n.data?.nodeType as string,
                  { ...n.data, ...patch },
                ),
              },
            }
          : n,
      ),
    );
  }

  function onDragStart(e: React.DragEvent, nodeType: string) {
    e.dataTransfer.setData("application/node-type", nodeType);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData("application/node-type");
    if (!nodeType || !rfRef.current || !wrapperRef.current) return;
    const position = rfRef.current.screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });
    const id = `n_${Math.random().toString(36).slice(2, 9)}`;
    const defaults = NODE_CATALOG.find((c) => c.type === nodeType)?.defaults ?? {};
    const newNode: BuilderNode = {
      id,
      type: "card",
      position,
      data: { nodeType, label: labelOf(nodeType, defaults), ...defaults },
    };
    setDirty(true);
    setNodes((ns) => ns.concat(newNode));
    setSelectedId(id);
  }

  async function save(publish?: boolean) {
    setSaving(true);
    try {
      const definition: WorkflowDefinition = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: (n.data?.nodeType as string) ?? "custom",
          position: n.position,
          data: stripMeta(n.data ?? {}),
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? null,
          targetHandle: e.targetHandle ?? null,
          label: typeof e.label === "string" ? e.label : undefined,
        })),
      };
      const res = await fetch(`/api/workflows/${workflowId}/builder`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ definition }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Save failed");
        return;
      }
      if (publish) {
        const pub = await fetch(`/api/workflows/${workflowId}/publish`, {
          method: "POST",
        });
        if (!pub.ok) {
          const j = await pub.json().catch(() => ({}));
          toast.error(j.error ?? "Publish failed");
          return;
        }
      }
      toast.success(publish ? "Published" : "Saved");
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    const res = await fetch(`/api/workflows/${workflowId}/run-now`, {
      method: "POST",
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error ?? "Run failed");
      return;
    }
    toast.success("Queued");
  }

  function fitCanvas() {
    rfRef.current?.fitView({ padding: 0.16, duration: 220 });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <header className="panel-surface flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/workflows/${workflowId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="text-sm font-semibold leading-tight">{workflowName}</div>
          <div className="text-[11px] text-muted-foreground leading-tight">
            {dirty ? "Unsaved changes" : (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" /> Saved
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={fitCanvas} title="Fit canvas">
            <ScanSearch className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={runNow}>
            <Play className="h-4 w-4" />
            Run now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => save(false)}
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            Save draft
          </Button>
          <Button size="sm" onClick={() => save(true)} disabled={saving}>
            <Rocket className="h-4 w-4" />
            Publish
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="panel-surface scrollbar-thin flex w-72 shrink-0 flex-col overflow-y-auto border-r border-border/60 bg-card/70 p-3">
          <div className="mb-3 flex items-center gap-2 px-1">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <Grid3X3 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Node catalog
              </div>
              <div className="text-xs text-muted-foreground">Drag onto the canvas</div>
            </div>
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
            Node catalog
          </div>
          <div className="space-y-2">
            {NODE_CATALOG.map((c) => (
              <div
                key={c.type}
                draggable
                onDragStart={(e) => onDragStart(e, c.type)}
                className="group flex cursor-grab items-center gap-3 rounded-2xl border border-border/60 bg-background/90 px-3 py-3 text-sm transition-all active:cursor-grabbing hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full ring-4 ring-background"
                  style={{ background: c.color, boxShadow: `0 0 0 1px ${c.color}33` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">{c.label}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {c.type.replace(/_/g, " ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 px-1">
            Drag a node onto the canvas to add it. Click a node to configure it.
          </p>
        </div>

        <div
          ref={wrapperRef}
          className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_30%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.55))]"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onInit={(i) => (rfRef.current = i)}
            onNodeClick={onNodeClick}
            nodeTypes={stableNodeTypes}
            fitView
            fitViewOptions={stableFitViewOptions}
            snapToGrid
            snapGrid={stableSnapGrid}
            deleteKeyCode={stableDeleteKeyCode}
            proOptions={stableProOptions}
            defaultEdgeOptions={stableDefaultEdgeOptions}
            onError={handleReactFlowError}
          >
            <Background gap={20} size={1.1} color="hsl(var(--border))" />
            <Controls position="bottom-left" showInteractive={true} />
          </ReactFlow>
        </div>

        <aside className="panel-surface scrollbar-thin w-80 shrink-0 overflow-y-auto border-l border-border/60 bg-card/72 p-4">
          <div className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1">
              Inspector
            </div>
            <div className="text-xs text-muted-foreground">
              Edit node inputs and runtime settings.
            </div>
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Inspector
          </div>
          {selected ? (
            <NodeInspector
              node={selected}
              onChange={updateSelectedData}
              onDelete={() => {
                setNodes((ns) => ns.filter((n) => n.id !== selected.id));
                setEdges((es) =>
                  es.filter(
                    (e) => e.source !== selected.id && e.target !== selected.id,
                  ),
                );
                setSelectedId(null);
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a node to edit its configuration.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function labelOf(type: string, data: Record<string, unknown> | undefined) {
  const d = data ?? {};
  const catalog = NODE_CATALOG.find((c) => c.type === type);
  const base = catalog?.label ?? type;
  if (type === "http_request" || type === "webhook") {
    return d.url ? String(d.url).slice(0, 40) : base;
  }
  if (type === "delay") {
    return `${base} ${d.seconds ?? 1}s`;
  }
  return base;
}

function stripMeta(data: Record<string, unknown>) {
  const { label: _l, nodeType: _n, ...rest } = data as Record<string, unknown>;
  void _l;
  void _n;
  return rest;
}

function NodeInspector({
  node,
  onChange,
  onDelete,
}: {
  node: Node<Record<string, unknown>>;
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const nodeType = (node.data?.nodeType as string) ?? "custom";
  const data = node.data ?? {};
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-background/80 p-3">
        <div className="text-xs text-muted-foreground">Type</div>
        <div className="mt-1 text-sm font-medium capitalize">{nodeType.replace(/_/g, " ")}</div>
      </div>
      {nodeType === "http_request" || nodeType === "webhook" ? (
        <>
          <Field label="URL">
            <Input
              value={String(data.url ?? "")}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://example.com/hook"
            />
          </Field>
          <Field label="Method">
            <Select
              value={String(data.method ?? "POST")}
              onChange={(e) => onChange({ method: e.target.value })}
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Body (JSON)">
            <Textarea
              rows={4}
              value={
                typeof data.body === "string"
                  ? (data.body as string)
                  : JSON.stringify(data.body ?? {}, null, 2)
              }
              onChange={(e) => {
                try {
                  onChange({ body: JSON.parse(e.target.value) });
                } catch {
                  onChange({ body: e.target.value });
                }
              }}
            />
          </Field>
        </>
      ) : null}
      {nodeType === "delay" ? (
        <Field label="Seconds">
          <Input
            type="number"
            min={0}
            max={30}
            value={Number(data.seconds ?? 1)}
            onChange={(e) => onChange({ seconds: Number(e.target.value) })}
          />
        </Field>
      ) : null}
      {nodeType === "condition" ? (
        <Field label="Expression (JS)">
          <Textarea
            rows={3}
            value={String(data.expression ?? "$input.value > 0")}
            onChange={(e) => onChange({ expression: e.target.value })}
          />
        </Field>
      ) : null}
      {nodeType === "trigger" ||
      nodeType === "schedule_trigger" ||
      nodeType === "webhook_trigger" ||
      nodeType === "api_trigger" ? (
        <Field label="Trigger type">
          <Select
            value={String(data.triggerType ?? "manual")}
            onChange={(e) => onChange({ triggerType: e.target.value })}
          >
            {["manual", "schedule", "webhook", "api", "event"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {nodeType === "send_email" || nodeType === "send_notification" ? (
        <>
          <Field label="Subject / Title">
            <Input
              value={String(data.title ?? "")}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </Field>
          <Field label="Message">
            <Textarea
              rows={3}
              value={String(data.message ?? "")}
              onChange={(e) => onChange({ message: e.target.value })}
            />
          </Field>
          {nodeType === "send_notification" ? (
            <Field label="Channels">
              <Select
                value={Array.isArray(data.channels) ? String((data.channels as string[])[0] ?? "both") : "both"}
                onChange={(e) => {
                  const value = e.target.value;
                  onChange({
                    channels:
                      value === "in_app"
                        ? ["in_app"]
                        : value === "push"
                          ? ["push"]
                          : ["in_app", "push"],
                  });
                }}
              >
                <option value="both">In-app + Push</option>
                <option value="in_app">In-app only</option>
                <option value="push">Push only</option>
              </Select>
            </Field>
          ) : null}
        </>
      ) : null}
      {nodeType === "ai_agent" ? (
        <Field label="Agent ID">
          <Input
            value={String(data.agentId ?? "")}
            onChange={(e) => onChange({ agentId: e.target.value })}
            placeholder="sales-followup-agent"
          />
        </Field>
      ) : null}
      <Button variant="destructive" size="sm" onClick={onDelete} className="w-full">
        Delete node
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
