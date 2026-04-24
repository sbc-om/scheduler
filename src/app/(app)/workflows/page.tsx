import Link from "next/link";
import { Plus, Workflow as WorkflowIcon } from "lucide-react";
import { requireSessionUser } from "@/lib/auth";
import { listWorkflows } from "@/modules/workflows/repository";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/utils";

export default async function WorkflowsPage() {
  const user = await requireSessionUser();
  const workflows = await listWorkflows(user.tenantId);
  return (
    <>
      <PageHeader
        title="Workflows"
        action={
          <Button asChild>
            <Link href="/workflows/new">
              <Plus className="h-4 w-4" />
              New workflow
            </Link>
          </Button>
        }
      />
      {workflows.length === 0 ? (
        <EmptyState
          title="No workflows yet"
          description="Create your first workflow to orchestrate scheduled jobs, webhooks and actions."
          action={
            <Button asChild>
              <Link href="/workflows/new">
                <Plus className="h-4 w-4" />
                Create workflow
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workflows.map((w) => (
            <Card key={w.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <WorkflowIcon className="h-4 w-4 text-primary" />
                      <Link
                        href={`/workflows/${w.id}`}
                        className="font-semibold hover:underline"
                      >
                        {w.name}
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      {w.code}
                    </div>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
                {w.description ? (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                    {w.description}
                  </p>
                ) : null}
                <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>v{w.latest_version_number}</span>
                  <span>·</span>
                  <span>updated {formatRelative(w.updated_at)}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/workflows/${w.id}`}>Overview</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/workflows/${w.id}/builder`}>Builder</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
