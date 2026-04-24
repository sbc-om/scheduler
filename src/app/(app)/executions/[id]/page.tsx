import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSessionUser } from "@/lib/auth";
import {
  getWorkflowRun,
  listStepRuns,
} from "@/modules/executions/repository";
import { queryOne } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDuration, formatRelative } from "@/lib/utils";

export default async function ExecutionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSessionUser();
  const run = await getWorkflowRun(user.tenantId, id);
  if (!run) notFound();
  const steps = await listStepRuns(user.tenantId, id);
  const workflow = await queryOne<{ name: string }>(
    `SELECT name FROM workflows WHERE id = $1 AND tenant_id = $2`,
    [run.workflow_id, user.tenantId],
  );
  return (
    <>
      <PageHeader
        title={`Run ${run.id.slice(0, 8)}`}
        action={
          <Link
            href={`/workflows/${run.workflow_id}`}
            className="text-sm text-primary hover:underline"
          >
            {workflow?.name ?? "workflow"}
          </Link>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Info label="Status" value={<StatusBadge status={run.status} />} />
        <Info label="Trigger" value={run.trigger_source} />
        <Info label="Duration" value={formatDuration(run.duration_ms)} />
        <Info label="Started" value={formatRelative(run.started_at)} />
      </div>

      {run.error_message ? (
        <Card className="border-destructive/40">
          <CardContent className="p-5 text-sm">
            <div className="text-destructive font-medium mb-1">Error</div>
            <pre className="font-mono text-xs whitespace-pre-wrap">
              {run.error_message}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Step timeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {steps.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No steps recorded.
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Node</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
                  <TH>Duration</TH>
                  <TH>Finished</TH>
                  <TH>Error</TH>
                </TR>
              </THead>
              <TBody>
                {steps.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-mono text-xs">{s.node_id}</TD>
                    <TD>{s.node_type}</TD>
                    <TD>
                      <StatusBadge status={s.status} />
                    </TD>
                    <TD className="tabular-nums">
                      {formatDuration(s.duration_ms)}
                    </TD>
                    <TD className="text-muted-foreground">
                      {formatRelative(s.finished_at)}
                    </TD>
                    <TD className="text-destructive text-xs">
                      {s.error_message ?? ""}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <JsonCard title="Input" value={run.input} />
        <JsonCard title="Output" value={run.output} />
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className="mt-2 text-sm">{value}</div>
      </CardContent>
    </Card>
  );
}

function JsonCard({ title, value }: { title: string; value: unknown }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-auto max-h-64 scrollbar-thin">
          {JSON.stringify(value ?? null, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
