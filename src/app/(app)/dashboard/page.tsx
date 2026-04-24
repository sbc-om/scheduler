import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  PlayCircle,
  Sparkles,
  XCircle,
} from "lucide-react";
import { requireSessionUser } from "@/lib/auth";
import { queryOne, queryRows } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { stats } from "@/modules/executions/repository";
import { formatRelative } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireSessionUser();
  const s = await stats(user.tenantId);
  const upcoming = await queryRows<{
    id: string;
    name: string;
    next_run_at: string | null;
    schedule_type: string;
    status: string;
  }>(
    `SELECT id, name, next_run_at, schedule_type, status
       FROM schedules
      WHERE tenant_id = $1 AND status = 'active' AND next_run_at IS NOT NULL
      ORDER BY next_run_at ASC LIMIT 8`,
    [user.tenantId],
  );
  const recent = await queryRows<{
    id: string;
    status: string;
    trigger_source: string;
    created_at: string;
    duration_ms: number | null;
    workflow_name: string;
  }>(
    `SELECT r.id, r.status, r.trigger_source, r.created_at, r.duration_ms,
            w.name AS workflow_name
       FROM workflow_runs r
       JOIN workflows w ON w.id = r.workflow_id
      WHERE r.tenant_id = $1
      ORDER BY r.created_at DESC
      LIMIT 8`,
    [user.tenantId],
  );
  const workers = await queryOne<{ worker_count: string }>(
    `SELECT COUNT(DISTINCT worker_name)::text AS worker_count
       FROM job_executions
      WHERE tenant_id = $1 AND started_at > now() - interval '5 minutes'`,
    [user.tenantId],
  );
  const totalSuccess = Number(s.success_24h) || 0;
  const totalFailed = Number(s.failed_24h) || 0;
  const attempts = totalSuccess + totalFailed;
  const successRate =
    attempts === 0 ? 100 : Math.round((totalSuccess / attempts) * 1000) / 10;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${greetingName(user.fullName ?? user.email)}`}
        eyebrow="Operations"
      />

      <Card className="hero-glow overflow-hidden border-border/70">
        <CardContent className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="absolute right-0 top-0 h-48 w-48 translate-x-10 -translate-y-10 rounded-full bg-primary/18 blur-3xl" />
          <div className="absolute bottom-0 right-16 h-28 w-28 rounded-full bg-accent/80 blur-3xl dark:bg-accent/20" />
          <div className="relative max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Live ops
            </div>
            <div className="mt-4 flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/50 bg-white/60 shadow-sm dark:border-white/10 dark:bg-white/5">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="max-w-2xl text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[2.35rem]">
                  One view for live workflows.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground/90">
                  Track runs, workers, and delivery health.
                </p>
              </div>
            </div>
          </div>
          <div className="relative grid grid-cols-2 gap-3 sm:min-w-[20rem] sm:grid-cols-2">
            <HeroMetric label="Queued" value={s.queued} icon={Clock3} />
            <HeroMetric label="Schedules" value={upcoming.length} icon={CalendarClock} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent="violet"
          icon={PlayCircle}
          label="Running now"
          value={s.running}
          hint={`${s.queued} queued`}
        />
        <StatCard
          accent="emerald"
          icon={CheckCircle2}
          label="Success · 24h"
          value={totalSuccess}
          hint={`${successRate}% success rate`}
        />
        <StatCard
          accent="rose"
          icon={XCircle}
          label="Failed · 24h"
          value={totalFailed}
          hint={totalFailed === 0 ? "all clear" : "needs attention"}
        />
        <StatCard
          accent="amber"
          icon={Activity}
          label="Active workers"
          value={Number(workers?.worker_count ?? 0)}
          hint="last 5 minutes"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent executions</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Latest runs across all workflows
              </p>
            </div>
            <Link
              href="/executions"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No executions yet. Run a workflow to see activity here.
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Workflow</TH>
                    <TH>Status</TH>
                    <TH>Trigger</TH>
                    <TH className="text-right">When</TH>
                  </TR>
                </THead>
                <TBody>
                  {recent.map((r) => (
                    <TR key={r.id}>
                      <TD>
                        <Link
                          href={`/executions/${r.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {r.workflow_name}
                        </Link>
                      </TD>
                      <TD>
                        <StatusBadge status={r.status} />
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {r.trigger_source}
                      </TD>
                      <TD className="text-right text-muted-foreground">
                        {formatRelative(r.created_at)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming schedules</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Next dispatch windows
              </p>
            </div>
            <Link
              href="/schedules"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {upcoming.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                <CalendarClock className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60" />
                No scheduled runs.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {upcoming.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/schedules/${item.id}`}
                        className="truncate text-sm font-medium hover:text-primary"
                      >
                        {item.name}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2">
                        <StatusBadge status={item.schedule_type} />
                      </div>
                    </div>
                    <div className="ml-3 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {formatRelative(item.next_run_at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function greetingName(name: string) {
  const clean = name.includes("@") ? name.split("@")[0] : name;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

type Accent = "violet" | "emerald" | "rose" | "amber";

const accentStyles: Record<
  Accent,
  { tile: string; icon: string; glow: string; edge: string }
> = {
  violet: {
    tile: "bg-[linear-gradient(135deg,hsl(188_100%_97%),hsl(198_96%_92%))] dark:bg-[linear-gradient(135deg,hsl(196_42%_22%),hsl(204_42%_15%))]",
    icon: "text-[hsl(196_72%_42%)] dark:text-[hsl(192_80%_74%)]",
    glow: "from-[hsl(188_88%_52%/0.22)] via-[hsl(198_88%_56%/0.08)] to-transparent",
    edge: "border-[hsl(192_66%_84%)] dark:border-[hsl(198_30%_25%)]",
  },
  emerald: {
    tile: "bg-[linear-gradient(135deg,hsl(154_80%_97%),hsl(168_70%_92%))] dark:bg-[linear-gradient(135deg,hsl(156_38%_22%),hsl(166_38%_15%))]",
    icon: "text-[hsl(158_60%_34%)] dark:text-[hsl(162_64%_70%)]",
    glow: "from-[hsl(156_62%_44%/0.22)] via-[hsl(168_62%_48%/0.08)] to-transparent",
    edge: "border-[hsl(160_44%_84%)] dark:border-[hsl(160_28%_24%)]",
  },
  rose: {
    tile: "bg-[linear-gradient(135deg,hsl(8_100%_98%),hsl(18_88%_93%))] dark:bg-[linear-gradient(135deg,hsl(10_42%_24%),hsl(6_42%_16%))]",
    icon: "text-[hsl(8_84%_54%)] dark:text-[hsl(8_82%_72%)]",
    glow: "from-[hsl(8_88%_60%/0.24)] via-[hsl(18_88%_58%/0.08)] to-transparent",
    edge: "border-[hsl(14_74%_86%)] dark:border-[hsl(8_28%_27%)]",
  },
  amber: {
    tile: "bg-[linear-gradient(135deg,hsl(34_100%_97%),hsl(42_86%_92%))] dark:bg-[linear-gradient(135deg,hsl(34_38%_23%),hsl(42_32%_16%))]",
    icon: "text-[hsl(28_88%_46%)] dark:text-[hsl(36_86%_68%)]",
    glow: "from-[hsl(28_90%_54%/0.22)] via-[hsl(40_86%_54%/0.08)] to-transparent",
    edge: "border-[hsl(36_70%_85%)] dark:border-[hsl(36_28%_25%)]",
  },
};

function HeroMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[1.35rem] border border-border/70 bg-white/65 px-4 py-3.5 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)] dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] tabular-nums">{value}</div>
    </div>
  );
}

function StatCard({
  accent,
  icon: Icon,
  label,
  value,
  hint,
}: {
  accent: Accent;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint?: string;
}) {
  const a = accentStyles[accent];
  return (
    <Card className={`metric-card relative overflow-hidden border ${a.edge} card-hover`}>
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br ${a.glow} blur-3xl`}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/12 to-transparent" />
      <CardContent className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-[30px] font-semibold leading-none tracking-tight tabular-nums">
            {value}
          </div>
          {hint ? (
            <div className="mt-2.5 text-xs text-muted-foreground">{hint}</div>
          ) : null}
        </div>
        <div
          className={`grid h-11 w-11 place-items-center rounded-2xl border border-white/40 shadow-sm dark:border-white/5 ${a.tile}`}
        >
          <Icon className={`h-5 w-5 ${a.icon}`} />
        </div>
      </CardContent>
    </Card>
  );
}
