import Link from "next/link";
import { requireSessionUser } from "@/lib/auth";
import { listWorkflowRuns } from "@/modules/executions/repository";
import { queryRows } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDuration, formatRelative } from "@/lib/utils";

export default async function ExecutionsPage() {
  const user = await requireSessionUser();
  const runs = await queryRows<{
    id: string;
    status: string;
    trigger_source: string;
    duration_ms: number | null;
    created_at: string;
    workflow_name: string;
  }>(
    `SELECT r.id, r.status, r.trigger_source, r.duration_ms, r.created_at,
            w.name AS workflow_name
       FROM workflow_runs r
       JOIN workflows w ON w.id = r.workflow_id
      WHERE r.tenant_id = $1
      ORDER BY r.created_at DESC
      LIMIT 200`,
    [user.tenantId],
  );
  // reference listWorkflowRuns is already used elsewhere; keep import consistent
  void listWorkflowRuns;

  return (
    <>
      <PageHeader title="Executions" />
      {runs.length === 0 ? (
        <EmptyState
          title="No executions"
          description="When you run or schedule a workflow, each run appears here with full history."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Run</TH>
                  <TH>Workflow</TH>
                  <TH>Status</TH>
                  <TH>Trigger</TH>
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
                    <TD>{r.workflow_name}</TD>
                    <TD>
                      <StatusBadge status={r.status} />
                    </TD>
                    <TD className="text-muted-foreground">
                      {r.trigger_source}
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
          </CardContent>
        </Card>
      )}
    </>
  );
}
