import {
  Building2,
  KeyRound,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Users,
} from "lucide-react";
import { requireSessionUser } from "@/lib/auth";
import { queryOne, queryRows } from "@/lib/db";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/utils";
import { NewKeyDialog } from "./new-key-dialog";
import { RevokeButton } from "./revoke-button";
import { CopyField, CopyButton } from "./copyable";
import { ApiReferencePanel } from "./api-reference-panel";
import { ApiPlayground } from "./api-playground";

type KeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  created_by_email: string | null;
  created_by_name: string | null;
};

type MemberRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  joined_at: string;
};

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_code: string;
  timezone: string;
  created_at: string;
};

export default async function ApiKeysPage() {
  const user = await requireSessionUser();

  const [tenant, keys, members] = await Promise.all([
    queryOne<TenantRow>(
      `SELECT id, name, slug, status, plan_code, timezone, created_at
         FROM tenants WHERE id = $1`,
      [user.tenantId],
    ),
    queryRows<KeyRow>(
      `SELECT k.id, k.name, k.key_prefix, k.created_at, k.last_used_at,
              k.revoked_at, k.expires_at,
              u.email AS created_by_email,
              u.full_name AS created_by_name
         FROM api_keys k
         LEFT JOIN users u ON u.id = k.created_by
        WHERE k.tenant_id = $1
        ORDER BY k.created_at DESC`,
      [user.tenantId],
    ),
    queryRows<MemberRow>(
      `SELECT m.user_id, u.email, u.full_name, m.role, m.created_at AS joined_at
         FROM tenant_memberships m
         JOIN users u ON u.id = m.user_id
        WHERE m.tenant_id = $1
        ORDER BY
          CASE m.role
            WHEN 'owner' THEN 0
            WHEN 'admin' THEN 1
            WHEN 'operator' THEN 2
            ELSE 3
          END,
          u.email ASC`,
      [user.tenantId],
    ),
  ]);

  const { active, revoked, expired } = summarizeKeys(keys);

  return (
    <>
      <PageHeader title="API Keys" action={<NewKeyDialog />} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile
          icon={ShieldCheck}
          tone="emerald"
          label="Active keys"
          value={active}
          hint={`${keys.length} total`}
        />
        <StatTile
          icon={ShieldAlert}
          tone="rose"
          label="Revoked / expired"
          value={revoked + expired}
          hint={expired > 0 ? `${expired} expired` : "rotate regularly"}
        />
        <StatTile
          icon={Users}
          tone="violet"
          label="Team members"
          value={members.length}
        />
        <StatTile
          icon={Building2}
          tone="amber"
          label="Plan"
          value={(tenant?.plan_code ?? "pro").toUpperCase()}
          hint={tenant?.timezone ?? "UTC"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              Organization credentials
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Use these values when configuring SDKs, webhooks, or CI pipelines.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field label="Organization">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {tenant?.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="font-mono">{tenant?.slug}</span>
                    {tenant?.status ? (
                      <Badge
                        variant={
                          tenant.status === "active" ? "success" : "warning"
                        }
                        className="capitalize"
                      >
                        {tenant.status}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <CopyButton value={tenant?.slug ?? ""} label="slug" size="sm" />
              </div>
            </Field>
            <Field label="Organization ID">
              <CopyField value={tenant?.id ?? ""} label="organization id" />
            </Field>
            <Field label="API base URL">
              <CopyField value={env.APP_URL} label="base URL" />
            </Field>
            <Field label="Signed in as">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {user.fullName ?? user.email}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {user.email}
                  </div>
                </div>
                <RoleBadge role={user.role} />
              </div>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              Team members
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              People with access to this tenant.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {members.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">
                No members.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {members.map((m) => (
                  <li
                    key={m.user_id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold uppercase text-primary">
                      {(m.full_name ?? m.email).slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {m.full_name ?? m.email}
                      </div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">
                        {m.email}
                      </div>
                    </div>
                    <RoleBadge role={m.role} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              Keys
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Machine-to-machine credentials scoped to this tenant.
            </p>
          </div>
          <NewKeyDialog variant="ghost" />
        </CardHeader>
        <CardContent className="p-0">
          {keys.length === 0 ? (
            <EmptyState
              title="No API keys yet"
              description="Create a key to authenticate CI jobs, internal services, or third-party integrations."
              action={<NewKeyDialog />}
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Prefix</TH>
                  <TH>Created by</TH>
                  <TH>Created</TH>
                  <TH>Last used</TH>
                  <TH>Expires</TH>
                  <TH>Status</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {keys.map((k) => {
                  const state = keyState(k);
                  return (
                    <TR key={k.id}>
                      <TD className="font-medium">{k.name}</TD>
                      <TD>
                        <div className="inline-flex items-center gap-1.5">
                          <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                            {k.key_prefix}…
                          </code>
                          <CopyButton
                            value={k.key_prefix}
                            label="prefix"
                            size="sm"
                          />
                        </div>
                      </TD>
                      <TD className="text-muted-foreground">
                        {k.created_by_email ? (
                          <span>
                            {k.created_by_name ?? k.created_by_email}
                          </span>
                        ) : (
                          <span className="italic">system</span>
                        )}
                      </TD>
                      <TD className="text-muted-foreground">
                        {formatRelative(k.created_at)}
                      </TD>
                      <TD className="text-muted-foreground">
                        {k.last_used_at ? formatRelative(k.last_used_at) : "never"}
                      </TD>
                      <TD className="text-muted-foreground">
                        {k.expires_at ? formatRelative(k.expires_at) : "never"}
                      </TD>
                      <TD>
                        <Badge variant={state.variant} className="capitalize">
                          {state.label}
                        </Badge>
                      </TD>
                      <TD className="text-right">
                        {k.revoked_at ? null : <RevokeButton id={k.id} />}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            API playground
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Test any endpoint live against this tenant. Cookies are omitted so only your API key authenticates.
          </p>
        </CardHeader>
        <CardContent>
          <ApiPlayground baseUrl={env.APP_URL} />
        </CardContent>
      </Card>

      <Card className="min-w-0 w-full overflow-hidden">
        <CardHeader className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            API reference
          </CardTitle>
          <p className="min-w-0 text-xs text-muted-foreground">
            Every request must include{" "}
            <code className="break-all rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              Authorization: Bearer &lt;key&gt;
            </code>
            . Calls are scoped to your tenant automatically.
          </p>
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden p-3 sm:p-5">
          <ApiReferencePanel baseUrl={env.APP_URL} />
        </CardContent>
      </Card>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
      {children}
    </div>
  );
}

function keyState(
  k: KeyRow,
): { label: string; variant: "success" | "destructive" | "warning" | "outline" } {
  const now = Date.now();
  if (k.revoked_at) return { label: "revoked", variant: "destructive" };
  if (k.expires_at && new Date(k.expires_at).getTime() <= now) {
    return { label: "expired", variant: "outline" };
  }
  if (k.expires_at) {
    const daysLeft =
      (new Date(k.expires_at).getTime() - now) / 86_400_000;
    if (daysLeft < 14) return { label: "expiring soon", variant: "warning" };
  }
  return { label: "active", variant: "success" };
}

function summarizeKeys(keys: KeyRow[]): {
  active: number;
  revoked: number;
  expired: number;
} {
  const now = Date.now();
  let active = 0;
  let revoked = 0;
  let expired = 0;
  for (const k of keys) {
    if (k.revoked_at) {
      revoked += 1;
      continue;
    }
    if (k.expires_at && new Date(k.expires_at).getTime() <= now) {
      expired += 1;
      continue;
    }
    active += 1;
  }
  return { active, revoked, expired };
}

function RoleBadge({ role }: { role: string }) {
  const variant =
    role === "owner"
      ? "default"
      : role === "admin"
        ? "info"
        : role === "operator"
          ? "secondary"
          : "outline";
  return (
    <Badge variant={variant} className="capitalize">
      {role}
    </Badge>
  );
}

type Tone = "emerald" | "rose" | "violet" | "amber";

const TONE_STYLES: Record<Tone, { bg: string; text: string; edge: string }> = {
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-300",
    edge: "border-emerald-500/20",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-300",
    edge: "border-rose-500/20",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-300",
    edge: "border-violet-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    edge: "border-amber-500/20",
  },
};

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  tone: Tone;
}) {
  const s = TONE_STYLES[tone];
  return (
    <Card className={`border ${s.edge}`}>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums">
            {value}
          </div>
          {hint ? (
            <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
          ) : null}
        </div>
        <div
          className={`grid h-10 w-10 place-items-center rounded-xl ${s.bg} ${s.text}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
