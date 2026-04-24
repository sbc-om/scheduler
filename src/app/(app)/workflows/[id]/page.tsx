import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireSessionUser } from "@/lib/auth";
import {
  getLatestVersion,
  getWorkflow,
} from "@/modules/workflows/repository";
import { listWorkflowRuns } from "@/modules/executions/repository";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDuration, formatRelative } from "@/lib/utils";
import { WorkflowActions } from "./actions";

export default async function WorkflowDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSessionUser();
  const workflow = await getWorkflow(user.tenantId, id);
  if (!workflow) notFound();
  const version = await getLatestVersion(user.tenantId, id);
  const runs = await listWorkflowRuns(user.tenantId, { workflowId: id, limit: 20 });
  const nodes = version?.definition.nodes.length ?? 0;
  const edges = version?.definition.edges.length ?? 0;

  return (
    <>
      <PageHeader
        title={workflow.name}
        action={
          <>
            <Button asChild variant="outline">
              <Link href={`/workflows/${workflow.id}/builder`}>
                <Pencil className="h-4 w-4" />
                Open builder
              </Link>
            </Button>
            <WorkflowActions id={workflow.id} />
          </>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase text-muted-foreground">Status</div>
            <div className="mt-2">
              <StatusBadge status={workflow.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase text-muted-foreground">Code</div>
            <div className="mt-2 font-mono text-sm">{workflow.code}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase text-muted-foreground">Version</div>
            <div className="mt-2 text-sm">
              v{workflow.latest_version_number} · {nodes} nodes · {edges} edges
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase text-muted-foreground">Updated</div>
            <div className="mt-2 text-sm">
              {formatRelative(workflow.updated_at)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No runs yet. Use <strong>Run now</strong> or schedule this workflow.
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Run</TH>
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
          )}
        </CardContent>
      </Card>
    </>
  );
}
