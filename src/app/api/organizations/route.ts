import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { query } from "@/lib/db";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";
import { sha256 } from "@/lib/security";
import {
  createOrganization,
  listUserTenants,
} from "@/modules/tenants/repository";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.userId === "api-key") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await listUserTenants(user.userId);
  return NextResponse.json({ organizations: rows });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]?$/,
      "Use lowercase letters, numbers, and hyphens",
    )
    .max(48)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  timezone: z.string().trim().min(1).max(80).optional(),
  switchTo: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.userId === "api-key") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const organization = await createOrganization({
    ownerUserId: user.userId,
    name: parsed.data.name,
    slug: parsed.data.slug,
    timezone: parsed.data.timezone,
  });
  // Switch the current session to the new organization by default so the
  // user lands directly in their new workspace.
  if (parsed.data.switchTo) {
    const jar = await cookies();
    const raw = jar.get(SESSION_COOKIE)?.value;
    if (raw) {
      await query(
        `UPDATE sessions SET tenant_id = $1 WHERE token_hash = $2 AND user_id = $3`,
        [organization.id, sha256(raw), user.userId],
      );
    }
  }
  return NextResponse.json({ organization }, { status: 201 });
}
