import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(500px 240px at 50% 0%, hsl(var(--primary) / 0.07), transparent 60%)",
        }}
      />
      <div className="relative flex flex-col items-center">
        {Icon ? (
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl border border-border/70 bg-gradient-to-b from-muted/70 to-muted/30 shadow-xs">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        ) : null}
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
