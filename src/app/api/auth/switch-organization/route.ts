import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";
import { sha256 } from "@/lib/security";

const schema = z.object({
  tenantId: z.string().uuid(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.userId === "api-key") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const membership = await queryOne<{ tenant_id: string }>(
    `SELECT tenant_id FROM tenant_memberships
      WHERE tenant_id = $1 AND user_id = $2`,
    [parsed.data.tenantId, user.userId],
  );
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return NextResponse.json({ error: "No session" }, { status: 401 });
  await query(
    `UPDATE sessions SET tenant_id = $1 WHERE token_hash = $2 AND user_id = $3`,
    [parsed.data.tenantId, sha256(raw), user.userId],
  );
  return NextResponse.json({ ok: true });
}
