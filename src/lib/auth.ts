import { cookies, headers } from "next/headers";
import { cache } from "react";
import { queryOne, query } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/security";

export const SESSION_COOKIE = "scheduler_session";
const SESSION_TTL_DAYS = 30;

export type SessionUser = {
  userId: string;
  tenantId: string;
  email: string;
  fullName: string | null;
  role: string;
  tenantName: string;
  tenantSlug: string;
};

export async function createSession(
  userId: string,
  tenantId: string,
): Promise<string> {
  const raw = randomToken(32);
  const tokenHash = sha256(raw);
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000);
  await query(
    `INSERT INTO sessions (user_id, tenant_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tenantId, tokenHash, expires],
  );
  return raw;
}

export async function destroySession(token: string): Promise<void> {
  await query(`DELETE FROM sessions WHERE token_hash = $1`, [sha256(token)]);
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Strict precedence: if an Authorization header is present, it must validate
  // as an active API key. Never silently fall through to the session cookie,
  // otherwise revoked/expired keys would be masked by a logged-in browser.
  const hdrs = await headers();
  const auth = hdrs.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return await fallbackApiKeyUser();
  }

  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const row = await queryOne<{
    user_id: string;
    tenant_id: string;
    email: string;
    full_name: string | null;
    role: string;
    tenant_name: string;
    tenant_slug: string;
  }>(
    `SELECT s.user_id, s.tenant_id,
            u.email, u.full_name,
            m.role,
            t.name AS tenant_name, t.slug AS tenant_slug
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN tenants t ON t.id = s.tenant_id
       LEFT JOIN tenant_memberships m
         ON m.user_id = s.user_id AND m.tenant_id = s.tenant_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
      LIMIT 1`,
    [sha256(raw)],
  );
  if (!row) return null;
  return {
    userId: row.user_id,
    tenantId: row.tenant_id,
    email: row.email,
    fullName: row.full_name,
    role: row.role ?? "viewer",
    tenantName: row.tenant_name,
    tenantSlug: row.tenant_slug,
  };
});

export async function requireSessionUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

async function fallbackApiKeyUser(): Promise<SessionUser | null> {
  const hdrs = await headers();
  const auth = hdrs.get("authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) return null;
  const raw = auth.slice(7).trim();
  if (!raw) return null;
  const row = await queryOne<{
    tenant_id: string;
    tenant_name: string;
    tenant_slug: string;
  }>(
    `SELECT k.tenant_id, t.name AS tenant_name, t.slug AS tenant_slug
       FROM api_keys k
       JOIN tenants t ON t.id = k.tenant_id
      WHERE k.key_hash = $1
        AND k.revoked_at IS NULL
        AND (k.expires_at IS NULL OR k.expires_at > now())
      LIMIT 1`,
    [sha256(raw)],
  );
  if (!row) return null;
  await query(
    `UPDATE api_keys SET last_used_at = now() WHERE key_hash = $1`,
    [sha256(raw)],
  );
  return {
    userId: "api-key",
    tenantId: row.tenant_id,
    email: "api-key@system",
    fullName: "API Key",
    role: "operator",
    tenantName: row.tenant_name,
    tenantSlug: row.tenant_slug,
  };
}
