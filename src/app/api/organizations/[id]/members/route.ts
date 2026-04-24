import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { hashPassword } from "@/lib/security";
import {
  TENANT_ROLES,
  addMember,
  getMembership,
  listMembers,
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const m = await getMembership(id, user.userId);
  if (!m) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const members = await listMembers(id);
  return NextResponse.json({ members, role: m.role });
}

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  fullName: z.string().trim().max(120).optional().default(""),
  role: z.enum(TENANT_ROLES as unknown as [TenantRole, ...TenantRole[]]),
  password: z.string().min(10).max(200),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const guard = await requireAdmin(id, user.userId);
  if (guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  // Only owners may create additional owners.
  if (parsed.data.role === "owner") {
    const me = await getMembership(id, user.userId);
    if (me?.role !== "owner") {
      return NextResponse.json(
        { error: "Only owners can create owners" },
        { status: 403 },
      );
    }
  }
  try {
    const member = await addMember({
      tenantId: id,
      email: parsed.data.email,
      fullName: parsed.data.fullName || null,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
    });
    return NextResponse.json({ member });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 },
    );
  }
}
