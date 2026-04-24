import { z } from "zod";

export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  label: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const WorkflowDefinitionSchema = z.object({
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;

export const EMPTY_WORKFLOW: WorkflowDefinition = {
  nodes: [
    {
      id: "trigger-1",
      type: "trigger",
      position: { x: 120, y: 140 },
      data: { label: "Trigger", triggerType: "manual" },
    },
  ],
  edges: [],
};

export function validateWorkflowGraph(def: WorkflowDefinition): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const n of def.nodes) {
    if (ids.has(n.id)) errors.push(`Duplicate node id: ${n.id}`);
    ids.add(n.id);
  }
  const hasTrigger = def.nodes.some((n) =>
    ["trigger", "schedule_trigger", "webhook_trigger", "api_trigger"].includes(
      n.type,
    ),
  );
  if (!hasTrigger) errors.push("Workflow must contain at least one trigger node.");
  for (const e of def.edges) {
    if (!ids.has(e.source)) errors.push(`Edge source not found: ${e.source}`);
    if (!ids.has(e.target)) errors.push(`Edge target not found: ${e.target}`);
  }
  return errors;
}
