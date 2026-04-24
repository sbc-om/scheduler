"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Pause, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScheduleRowActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function act(path: string, method = "POST") {
    start(async () => {
      const res = await fetch(`/api/schedules/${id}/${path}`, { method });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Action failed");
        return;
      }
      toast.success("Done");
      router.refresh();
    });
  }

  function del() {
    if (!confirm("Delete this schedule?")) return;
    start(async () => {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Delete failed");
        return;
      }
      toast.success("Deleted");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() => act("run-now")}
        title="Run now"
      >
        <Play className="h-4 w-4" />
      </Button>
      {status === "active" ? (
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          onClick={() => act("pause")}
          title="Pause"
        >
          <Pause className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          onClick={() => act("resume")}
          title="Resume"
        >
          <Play className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={del}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
