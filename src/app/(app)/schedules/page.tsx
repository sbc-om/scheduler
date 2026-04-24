import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSessionUser } from "@/lib/auth";
import { listSchedules } from "@/modules/schedules/repository";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/utils";
import { ScheduleRowActions } from "./row-actions";

export default async function SchedulesPage() {
  const user = await requireSessionUser();
  const schedules = await listSchedules(user.tenantId);
  return (
    <>
      <PageHeader
        title="Schedules"
        action={
          <Button asChild>
            <Link href="/schedules/new">
              <Plus className="h-4 w-4" /> New schedule
            </Link>
          </Button>
        }
      />
      {schedules.length === 0 ? (
        <EmptyState
          title="No schedules yet"
          description="Create a schedule to run a workflow on cron, interval, or at a specific time."
          action={
            <Button asChild>
              <Link href="/schedules/new">Create schedule</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
                  <TH>Expression</TH>
                  <TH>Next run</TH>
                  <TH className="w-24" />
                </TR>
              </THead>
              <TBody>
                {schedules.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-medium">
                      <Link
                        href={`/schedules/${s.id}`}
                        className="hover:underline"
                      >
                        {s.name}
                      </Link>
                    </TD>
                    <TD>
                      <StatusBadge status={s.schedule_type} />
                    </TD>
                    <TD>
                      <StatusBadge status={s.status} />
                    </TD>
                    <TD className="font-mono text-xs text-muted-foreground">
                      {s.cron_expression ??
                        s.rrule ??
                        (s.interval_seconds ? `every ${s.interval_seconds}s` : "—")}
                    </TD>
                    <TD className="text-muted-foreground">
                      {formatRelative(s.next_run_at)}
                    </TD>
                    <TD>
                      <ScheduleRowActions id={s.id} status={s.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
