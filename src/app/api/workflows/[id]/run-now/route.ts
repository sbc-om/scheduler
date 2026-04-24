import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { dispatchWorkflow } from "@/modules/jobs/dispatch";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const body = await req.json().catch(() => ({}));
    const runId = await dispatchWorkflow({
      tenantId: user.tenantId,
      workflowId: id,
      scheduleId: null,
      triggerSource: "manual",
      payload: (body?.payload as Record<string, unknown>) ?? {},
      preferPublished: false,
    });
    return NextResponse.json({ runId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
