import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import {
  WorkflowDefinitionSchema,
  validateWorkflowGraph,
} from "@/modules/workflows/graph";
import { saveBuilderDraft } from "@/modules/workflows/repository";

const Body = z.object({ definition: WorkflowDefinitionSchema });

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const body = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid definition", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const version = await saveBuilderDraft({
      tenantId: user.tenantId,
      workflowId: id,
      definition: parsed.data.definition,
      createdBy: user.userId === "api-key" ? null : user.userId,
    });
    const errors = validateWorkflowGraph(version.definition);
    return NextResponse.json({
      version,
      validation: { errors },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
