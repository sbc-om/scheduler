import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireSessionUser();
  await query(
    `UPDATE api_keys SET revoked_at = now()
      WHERE tenant_id = $1 AND id = $2 AND revoked_at IS NULL`,
    [user.tenantId, id],
  );
  return NextResponse.json({ ok: true });
}
