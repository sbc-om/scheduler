import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { listUserNotifications, unreadNotificationCount } from "@/modules/notifications/repository";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const [items, unread] = await Promise.all([
      listUserNotifications({ tenantId: user.tenantId, userId: user.userId, limit: 50 }),
      unreadNotificationCount({ tenantId: user.tenantId, userId: user.userId }),
    ]);
    return NextResponse.json({ items, unread });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 401 });
  }
}