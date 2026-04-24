import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import { query, queryRows } from "@/lib/db";
import { generateApiKey } from "@/lib/security";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  expiresInDays: z
    .number()
    .int()
    .positive()
    .max(3650)
    .nullable()
    .optional(),
});

export async function GET() {
  const user = await requireSessionUser();
  const rows = await queryRows(
    `SELECT id, name, key_prefix, created_at, last_used_at, revoked_at, expires_at
       FROM api_keys WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [user.tenantId],
  );
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const user = await requireSessionUser();
  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { raw, prefix, hash } = generateApiKey();
  const expiresAt =
    parsed.data.expiresInDays != null
      ? new Date(Date.now() + parsed.data.expiresInDays * 86400_000)
      : null;
  await query(
    `INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash, expires_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      user.tenantId,
      parsed.data.name,
      prefix,
      hash,
      expiresAt,
      user.userId === "api-key" ? null : user.userId,
    ],
  );
  return NextResponse.json({
    key: raw,
    prefix,
    expiresAt: expiresAt?.toISOString() ?? null,
  });
}
