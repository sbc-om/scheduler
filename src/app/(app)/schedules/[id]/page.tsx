import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSessionUser } from "@/lib/auth";
import { getSchedule } from "@/modules/schedules/repository";
import { listWorkflowRuns } from "@/modules/executions/repository";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDuration, formatRelative } from "@/lib/utils";
import { ScheduleRowActions } from "../row-actions";

export default async function ScheduleDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSessionUser();
  const s = await getSchedule(user.tenantId, id);
  if (!s) notFound();
  const runs = await listWorkflowRuns(user.tenantId, { scheduleId: id, limit: 30 });

  return (
    <>
      <PageHeader
        title={s.name}
        action={<ScheduleRowActions id={s.id} status={s.status} />}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Info label="Status" value={<StatusBadge status={s.status} />} />
        <Info label="Type" value={<StatusBadge status={s.schedule_type} />} />
        <Info label="Timezone" value={s.timezone} />
        <Info label="Next run" value={formatRelative(s.next_run_at)} />
        <Info label="Cron" value={s.cron_expression ?? "—"} mono />
        <Info label="RRULE" value={s.rrule ?? "—"} mono />
        <Info
          label="Interval"
          value={s.interval_seconds ? `${s.interval_seconds}s` : "—"}
        />
        <Info label="Priority" value={String(s.priority)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Runs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No runs recorded yet.
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Run</TH>
                  <TH>Status</TH>
                  <TH>Duration</TH>
                  <TH>When</TH>
                </TR>
              </THead>
              <TBody>
                {runs.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-mono text-xs">
                      <Link
                        href={`/executions/${r.id}`}
                        className="hover:underline"
                      >
                        {r.id.slice(0, 8)}
                      </Link>
                    </TD>
                    <TD>
                      <StatusBadge status={r.status} />
                    </TD>
                    <TD className="tabular-nums">
                      {formatDuration(r.duration_ms)}
                    </TD>
                    <TD className="text-muted-foreground">
                      {formatRelative(r.created_at)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className={"mt-2 " + (mono ? "font-mono text-sm" : "text-sm")}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
