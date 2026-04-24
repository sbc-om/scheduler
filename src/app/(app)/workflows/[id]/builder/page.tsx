import { notFound } from "next/navigation";
import { requireSessionUser } from "@/lib/auth";
import {
  getDraftVersion,
  getLatestVersion,
  getWorkflow,
} from "@/modules/workflows/repository";
import { EMPTY_WORKFLOW } from "@/modules/workflows/graph";
import { BuilderClient } from "./builder-client";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSessionUser();
  const wf = await getWorkflow(user.tenantId, id);
  if (!wf) notFound();
  const version =
    (await getDraftVersion(user.tenantId, id)) ??
    (await getLatestVersion(user.tenantId, id));
  const definition = version?.definition ?? EMPTY_WORKFLOW;
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden">
      <BuilderClient
        workflowId={wf.id}
        workflowName={wf.name}
        initialDefinition={definition}
      />
    </div>
  );
}
