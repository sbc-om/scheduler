import { Badge } from "./badge";
import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "success"
  | "warning"
  | "info";

type StatusInfo = { variant: Variant; pulse?: boolean; label?: string };

const STATUS_MAP: Record<string, StatusInfo> = {
  // lifecycle
  active: { variant: "success" },
  paused: { variant: "warning" },
  completed: { variant: "secondary" },
  cancelled: { variant: "outline" },
  archived: { variant: "outline" },
  expired: { variant: "outline" },
  // workflow versions
  draft: { variant: "secondary" },
  published: { variant: "success" },
  retired: { variant: "outline" },
  // execution
  queued: { variant: "info" },
  pending: { variant: "secondary" },
  running: { variant: "info", pulse: true },
  success: { variant: "success" },
  failed: { variant: "destructive" },
  retrying: { variant: "warning", pulse: true },
  timed_out: { variant: "destructive" },
  dead_lettered: { variant: "destructive" },
  skipped: { variant: "outline" },
  // schedule types
  once: { variant: "info" },
  delayed: { variant: "info" },
  cron: { variant: "default" },
  interval: { variant: "default" },
  rrule: { variant: "default" },
  manual: { variant: "secondary" },
  event: { variant: "secondary" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const info = STATUS_MAP[status] ?? { variant: "outline" as const };
  return (
    <Badge variant={info.variant} className={cn("capitalize", className)}>
      <span
        className={cn("dot-solid", info.pulse ? "pulse-dot" : "")}
        aria-hidden
      />
      {(info.label ?? status).replace(/_/g, " ")}
    </Badge>
  );
}
