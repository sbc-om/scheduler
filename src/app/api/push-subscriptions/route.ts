import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { disablePushSubscription, upsertPushSubscription } from "@/modules/notifications/repository";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = schema.parse(await req.json());
    await upsertPushSubscription({
      tenantId: user.tenantId,
      userId: user.userId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: req.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = schema.pick({ endpoint: true }).parse(await req.json());
    await disablePushSubscription({
      tenantId: user.tenantId,
      userId: user.userId,
      endpoint: body.endpoint,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}