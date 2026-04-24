import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { markAllNotificationsRead } from "@/modules/notifications/repository";

export async function POST() {
  try {
    const user = await requireSessionUser();
    await markAllNotificationsRead({
      tenantId: user.tenantId,
      userId: user.userId,
    });
    return NextResponse.json({ ok: true, unread: 0 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}