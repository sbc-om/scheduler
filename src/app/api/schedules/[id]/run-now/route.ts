import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { dispatchWorkflow } from "@/modules/jobs/dispatch";
import { getSchedule } from "@/modules/schedules/repository";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireSessionUser();
  const s = await getSchedule(user.tenantId, id);
  if (!s || !s.workflow_id) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }
  const runId = await dispatchWorkflow({
    tenantId: user.tenantId,
    workflowId: s.workflow_id,
    scheduleId: s.id,
    triggerSource: "manual:schedule",
    payload: s.payload ?? {},
  });
  return NextResponse.json({ runId });
}
