import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import {
  deleteSchedule,
  getSchedule,
} from "@/modules/schedules/repository";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireSessionUser();
  const s = await getSchedule(user.tenantId, id);
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(s);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireSessionUser();
  await deleteSchedule(user.tenantId, id);
  return NextResponse.json({ ok: true });
}
