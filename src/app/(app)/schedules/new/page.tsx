import { requireSessionUser } from "@/lib/auth";
import { listWorkflows } from "@/modules/workflows/repository";
import { PageHeader } from "@/components/app/page-header";
import { NewScheduleForm } from "./new-form";

export default async function NewSchedulePage() {
  const user = await requireSessionUser();
  const workflows = await listWorkflows(user.tenantId);
  return (
    <>
      <PageHeader title="New schedule" />
      <div className="max-w-2xl">
        <NewScheduleForm
          workflows={workflows.map((w) => ({
            id: w.id,
            name: w.name,
            status: w.status,
            hasPublished: Boolean(w.published_version_id),
          }))}
        />
      </div>
    </>
  );
}
