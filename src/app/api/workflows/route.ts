import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { createWorkflow, listWorkflows } from "@/modules/workflows/repository";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const rows = await listWorkflows(user.tenantId);
    return NextResponse.json({ workflows: rows });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const CreateSchema = z.object({
  name: z.string().min(1),
  code: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]{0,60}$/i),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = await req.json().catch(() => ({}));
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    try {
      const { workflow } = await createWorkflow({
        tenantId: user.tenantId,
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        createdBy: user.userId === "api-key" ? null : user.userId,
      });
      return NextResponse.json(workflow);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("duplicate key"))
        return NextResponse.json(
          { error: "Code already exists" },
          { status: 409 },
        );
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
