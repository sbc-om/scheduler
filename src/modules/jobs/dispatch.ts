import { randomUUID } from "node:crypto";
import { QUEUE_EXECUTE_WORKFLOW, getBoss, type ExecuteWorkflowJob } from "@/lib/queue";
import { createWorkflowRun } from "@/modules/executions/repository";
import { getPublishedVersion, getLatestVersion, getWorkflow } from "@/modules/workflows/repository";

export async function dispatchWorkflow(input: {
  tenantId: string;
  workflowId: string;
  scheduleId: string | null;
  triggerSource: string;
  payload: Record<string, unknown>;
  preferPublished?: boolean;
}): Promise<string> {
  const wf = await getWorkflow(input.tenantId, input.workflowId);
  if (!wf) throw new Error("Workflow not found");
  const version =
    (input.preferPublished !== false
      ? await getPublishedVersion(input.tenantId, input.workflowId)
      : null) ?? (await getLatestVersion(input.tenantId, input.workflowId));
  if (!version) throw new Error("Workflow has no version");

  const run = await createWorkflowRun({
    tenantId: input.tenantId,
    workflowId: wf.id,
    workflowVersionId: version.id,
    scheduleId: input.scheduleId,
    triggerSource: input.triggerSource,
    payload: input.payload,
  });

  const boss = await getBoss();
  const job: ExecuteWorkflowJob = {
    tenantId: input.tenantId,
    workflowId: wf.id,
    workflowVersionId: version.id,
    workflowRunId: run.id,
    scheduleId: input.scheduleId,
    triggerSource: input.triggerSource,
    input: input.payload,
  };
  await boss.send(QUEUE_EXECUTE_WORKFLOW, job, {
    singletonKey: `${run.id}-${randomUUID()}`,
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
  });
  return run.id;
}
