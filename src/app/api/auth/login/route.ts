import { NextResponse } from "next/server";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { verifyPassword } from "@/lib/security";
import { SESSION_COOKIE, createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const user = await queryOne<{
    id: string;
    password_hash: string;
  }>(`SELECT id, password_hash FROM users WHERE email = $1 AND status = 'active'`, [
    parsed.data.email,
  ]);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const ok = await verifyPassword(parsed.data.password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const membership = await queryOne<{ tenant_id: string }>(
    `SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [user.id],
  );
  if (!membership) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }
  const token = await createSession(user.id, membership.tenant_id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
