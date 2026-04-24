"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

type Workflow = {
  id: string;
  name: string;
  status: string;
  hasPublished: boolean;
};

export function NewScheduleForm({ workflows }: { workflows: Workflow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [workflowId, setWorkflowId] = useState(workflows[0]?.id ?? "");
  const [scheduleType, setScheduleType] = useState<
    "cron" | "interval" | "once" | "delayed" | "manual"
  >("cron");
  const [cron, setCron] = useState("*/5 * * * *");
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [runAt, setRunAt] = useState(() =>
    new Date(Date.now() + 10 * 60_000).toISOString().slice(0, 16),
  );
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!workflowId) {
      toast.error("Create a workflow first");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name,
        workflowId,
        scheduleType,
        timezone,
      };
      if (scheduleType === "cron") body.cronExpression = cron;
      if (scheduleType === "interval") body.intervalSeconds = intervalSeconds;
      if (scheduleType === "once" || scheduleType === "delayed") {
        body.runAt = new Date(runAt).toISOString();
      }
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed");
        return;
      }
      toast.success("Schedule created");
      router.push("/schedules");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Daily 9am sync"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Workflow</Label>
            <Select
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              required
            >
              {workflows.length === 0 ? (
                <option value="">No workflows</option>
              ) : (
                workflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.hasPublished ? "" : "(draft only)"}
                  </option>
                ))
              )}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={scheduleType}
              onChange={(e) =>
                setScheduleType(e.target.value as typeof scheduleType)
              }
            >
              <option value="cron">Cron</option>
              <option value="interval">Interval</option>
              <option value="once">Once</option>
              <option value="delayed">Delayed</option>
              <option value="manual">Manual</option>
            </Select>
          </div>

          {scheduleType === "cron" ? (
            <div className="space-y-1.5">
              <Label>Cron expression</Label>
              <Input
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                placeholder="*/5 * * * *"
                required
                className="font-mono"
              />
            </div>
          ) : null}

          {scheduleType === "interval" ? (
            <div className="space-y-1.5">
              <Label>Interval (seconds)</Label>
              <Input
                type="number"
                min={10}
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                required
              />
            </div>
          ) : null}

          {(scheduleType === "once" || scheduleType === "delayed") ? (
            <div className="space-y-1.5">
              <Label>Run at</Label>
              <Input
                type="datetime-local"
                value={runAt}
                onChange={(e) => setRunAt(e.target.value)}
                required
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="UTC"
            />
          </div>

          <div className="flex justify-end">
            <Button disabled={loading}>
              {loading ? "Creating…" : "Create schedule"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
