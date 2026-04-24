import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { markNotificationRead } from "@/modules/notifications/repository";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    await markNotificationRead({
      tenantId: user.tenantId,
      userId: user.userId,
      notificationId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}