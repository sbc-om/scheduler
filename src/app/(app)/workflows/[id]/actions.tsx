"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WorkflowActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function publish() {
    start(async () => {
      const res = await fetch(`/api/workflows/${id}/publish`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Publish failed");
        return;
      }
      toast.success("Workflow published");
      router.refresh();
    });
  }

  function runNow() {
    start(async () => {
      const res = await fetch(`/api/workflows/${id}/run-now`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Run failed");
        return;
      }
      toast.success("Workflow queued");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" disabled={pending} onClick={publish}>
        <Rocket className="h-4 w-4" />
        Publish
      </Button>
      <Button disabled={pending} onClick={runNow}>
        <Play className="h-4 w-4" />
        Run now
      </Button>
    </>
  );
}
