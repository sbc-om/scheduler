import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  TENANT_ROLES,
  getMembership,
  removeMember,
  updateMemberRole,
  type TenantRole,
} from "@/modules/tenants/repository";

async function requireAdmin(tenantId: string, userId: string) {
  const m = await getMembership(tenantId, userId);
  if (!m) return { error: "Not a member", status: 403 as const };
  if (m.role !== "owner" && m.role !== "admin") {
    return { error: "Forbidden", status: 403 as const };
  }
  return null;
}

const patchSchema = z.object({
  role: z.enum(TENANT_ROLES as unknown as [TenantRole, ...TenantRole[]]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, userId } = await params;
  const guard = await requireAdmin(id, user.userId);
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  // Only owners may grant the owner role.
  if (parsed.data.role === "owner") {
    const me = await getMembership(id, user.userId);
    if (me?.role !== "owner") {
      return NextResponse.json(
        { error: "Only owners can grant the owner role" },
        { status: 403 },
      );
    }
  }
  try {
    const member = await updateMemberRole(id, userId, parsed.data.role);
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ member });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, userId } = await params;
  // A user can always remove themselves; otherwise admin/owner is required.
  if (userId !== user.userId) {
    const guard = await requireAdmin(id, user.userId);
    if (guard) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
  }
  try {
    await removeMember(id, userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
