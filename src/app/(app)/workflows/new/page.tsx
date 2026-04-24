import { PageHeader } from "@/components/app/page-header";
import { NewWorkflowForm } from "./new-form";

export default function NewWorkflowPage() {
  return (
    <>
      <PageHeader title="New workflow" />
      <div className="max-w-2xl">
        <NewWorkflowForm />
      </div>
    </>
  );
}
