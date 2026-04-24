import { NextResponse } from "next/server";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { hashPassword, sha256, verifyPassword } from "@/lib/security";
import { cookies } from "next/headers";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10).max(200),
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
    return NextResponse.json(
      { error: "Password must be at least 10 characters" },
      { status: 400 },
    );
  }
  const row = await queryOne<{ password_hash: string }>(
    `SELECT password_hash FROM users WHERE id = $1`,
    [user.userId],
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ok = await verifyPassword(parsed.data.currentPassword, row.password_hash);
  if (!ok) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 },
    );
  }
  const newHash = await hashPassword(parsed.data.newPassword);
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
    newHash,
    user.userId,
  ]);
  // Invalidate every other session for this user so a compromised device is
  // locked out the moment the password changes. Keep the current session.
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    await query(
      `DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2`,
      [user.userId, sha256(raw)],
    );
  } else {
    await query(`DELETE FROM sessions WHERE user_id = $1`, [user.userId]);
  }
  return NextResponse.json({ ok: true });
}
