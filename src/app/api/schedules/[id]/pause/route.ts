import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { recomputeNextRun, setStatus } from "@/modules/schedules/repository";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireSessionUser();
  await setStatus(user.tenantId, id, "paused");
  return NextResponse.json({ ok: true });
}
export const runtime = "nodejs";
void recomputeNextRun;
