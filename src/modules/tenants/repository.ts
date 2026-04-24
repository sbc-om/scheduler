import { query, queryOne, queryRows, withTransaction } from "@/lib/db";

export type TenantRole = "owner" | "admin" | "operator" | "viewer";
export const TENANT_ROLES: readonly TenantRole[] = [
  "owner",
  "admin",
  "operator",
  "viewer",
];

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_code: string;
  timezone: string;
  role: TenantRole;
  member_count: number;
  created_at: string;
};

export type TenantMember = {
  user_id: string;
  email: string;
  full_name: string | null;
  status: string;
  role: TenantRole;
  joined_at: string;
};

/** Tenants the current user belongs to, with their role and member count. */
export async function listUserTenants(userId: string): Promise<TenantSummary[]> {
  return queryRows<TenantSummary>(
    `SELECT t.id, t.name, t.slug, t.status, t.plan_code, t.timezone,
            m.role::text AS role,
            m.created_at AS created_at,
            (SELECT COUNT(*)::int FROM tenant_memberships mm
              WHERE mm.tenant_id = t.id) AS member_count
       FROM tenant_memberships m
       JOIN tenants t ON t.id = m.tenant_id
      WHERE m.user_id = $1
      ORDER BY t.name ASC`,
    [userId],
  );
}

export async function getMembership(
  tenantId: string,
  userId: string,
): Promise<{ role: TenantRole } | null> {
  return queryOne<{ role: TenantRole }>(
    `SELECT role::text AS role
       FROM tenant_memberships
      WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, userId],
  );
}

export async function listMembers(tenantId: string): Promise<TenantMember[]> {
  return queryRows<TenantMember>(
    `SELECT u.id AS user_id, u.email, u.full_name, u.status,
            m.role::text AS role, m.created_at AS joined_at
       FROM tenant_memberships m
       JOIN users u ON u.id = m.user_id
      WHERE m.tenant_id = $1
      ORDER BY
        CASE m.role
          WHEN 'owner' THEN 0
          WHEN 'admin' THEN 1
          WHEN 'operator' THEN 2
          ELSE 3
        END ASC,
        u.email ASC`,
    [tenantId],
  );
}

export async function countOwners(tenantId: string): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM tenant_memberships
      WHERE tenant_id = $1 AND role = 'owner'`,
    [tenantId],
  );
  return Number(r?.n ?? 0);
}

/**
 * Add a user to a tenant. If the email is new, a fresh user row is created
 * with the given password. Otherwise the existing user is just linked.
 */
export async function addMember(input: {
  tenantId: string;
  email: string;
  fullName: string | null;
  role: TenantRole;
  passwordHash: string;
}): Promise<TenantMember> {
  return withTransaction(async (client) => {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [input.email],
    );
    let userId = existing.rows[0]?.id;
    if (!userId) {
      const ins = await client.query<{ id: string }>(
        `INSERT INTO users (email, full_name, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [input.email, input.fullName, input.passwordHash],
      );
      userId = ins.rows[0].id;
    }
    const dupe = await client.query<{ id: string }>(
      `SELECT id FROM tenant_memberships
        WHERE tenant_id = $1 AND user_id = $2`,
      [input.tenantId, userId],
    );
    if (dupe.rows[0]) {
      throw new Error("User is already a member");
    }
    await client.query(
      `INSERT INTO tenant_memberships (tenant_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [input.tenantId, userId, input.role],
    );
    const r = await client.query<TenantMember>(
      `SELECT u.id AS user_id, u.email, u.full_name, u.status,
              m.role::text AS role, m.created_at AS joined_at
         FROM tenant_memberships m
         JOIN users u ON u.id = m.user_id
        WHERE m.tenant_id = $1 AND m.user_id = $2`,
      [input.tenantId, userId],
    );
    return r.rows[0];
  });
}

export async function updateMemberRole(
  tenantId: string,
  userId: string,
  role: TenantRole,
): Promise<TenantMember | null> {
  // Do not allow removing the final owner via role-demotion.
  if (role !== "owner") {
    const current = await getMembership(tenantId, userId);
    if (current?.role === "owner") {
      const owners = await countOwners(tenantId);
      if (owners <= 1) throw new Error("Cannot demote the only owner");
    }
  }
  const r = await query<TenantMember>(
    `UPDATE tenant_memberships SET role = $1
      WHERE tenant_id = $2 AND user_id = $3
      RETURNING
        (SELECT email FROM users WHERE id = user_id) AS email,
        user_id,
        (SELECT full_name FROM users WHERE id = user_id) AS full_name,
        (SELECT status FROM users WHERE id = user_id) AS status,
        role::text AS role,
        created_at AS joined_at`,
    [role, tenantId, userId],
  );
  return r.rows[0] ?? null;
}

export async function removeMember(
  tenantId: string,
  userId: string,
): Promise<void> {
  const current = await getMembership(tenantId, userId);
  if (current?.role === "owner") {
    const owners = await countOwners(tenantId);
    if (owners <= 1) throw new Error("Cannot remove the only owner");
  }
  await query(
    `DELETE FROM tenant_memberships WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, userId],
  );
}

export async function updateTenant(
  tenantId: string,
  input: { name?: string; timezone?: string },
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (typeof input.name === "string") {
    params.push(input.name);
    sets.push(`name = $${params.length}`);
  }
  if (typeof input.timezone === "string") {
    params.push(input.timezone);
    sets.push(`timezone = $${params.length}`);
  }
  if (sets.length === 0) return;
  params.push(tenantId);
  await query(
    `UPDATE tenants SET ${sets.join(", ")} WHERE id = $${params.length}`,
    params,
  );
}

/** Slugify a free-form organization name into a URL-safe identifier. */
function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * Create a new organization (tenant) with the current user as its sole owner.
 *
 * Runs in a single transaction so a failure cannot leave a tenant without any
 * owner. Slug collisions are resolved automatically with a short random
 * suffix, so the caller never needs a retry loop.
 */
export async function createOrganization(input: {
  ownerUserId: string;
  name: string;
  slug?: string;
  timezone?: string;
}): Promise<TenantSummary> {
  const baseSlug = slugify(input.slug ?? input.name) || "org";

  return withTransaction(async (client) => {
    // Try the requested slug, then fall back to suffixed variants. The
    // `tenants.slug` column is UNIQUE so the DB is the source of truth.
    let slug = baseSlug;
    for (let attempt = 0; attempt < 8; attempt++) {
      const exists = await client.query<{ id: string }>(
        `SELECT id FROM tenants WHERE slug = $1`,
        [slug],
      );
      if (!exists.rows[0]) break;
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const tenantRow = await client.query<{
      id: string;
      name: string;
      slug: string;
      status: string;
      plan_code: string;
      timezone: string;
      created_at: string;
    }>(
      `INSERT INTO tenants (name, slug, timezone)
       VALUES ($1, $2, COALESCE($3, 'UTC'))
       RETURNING id, name, slug, status, plan_code, timezone, created_at`,
      [input.name, slug, input.timezone ?? null],
    );
    const tenant = tenantRow.rows[0];

    await client.query(
      `INSERT INTO tenant_memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [tenant.id, input.ownerUserId],
    );

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      plan_code: tenant.plan_code,
      timezone: tenant.timezone,
      role: "owner",
      member_count: 1,
      created_at: tenant.created_at,
    };
  });
}
