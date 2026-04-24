import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { publishWorkflow } from "@/modules/workflows/repository";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const version = await publishWorkflow({
      tenantId: user.tenantId,
      workflowId: id,
    });
    return NextResponse.json({ version });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
