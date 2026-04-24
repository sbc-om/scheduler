"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label,
  className,
  size = "md",
}: {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(label ? `${label} copied` : "Copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copy failed");
    }
  }
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/70 p-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary",
        size === "sm" && "p-1",
        className,
      )}
      aria-label={label ? `Copy ${label}` : "Copy"}
    >
      {copied ? (
        <Check className={cn(dim, "text-green-600")} />
      ) : (
        <Copy className={dim} />
      )}
    </button>
  );
}

export function CopyField({
  value,
  label,
  mono = true,
  className,
}: {
  value: string;
  label?: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2",
        className,
      )}
    >
      <code
        className={cn(
          "min-w-0 flex-1 truncate text-xs",
          mono ? "font-mono" : "",
        )}
      >
        {value}
      </code>
      <CopyButton value={value} label={label} size="sm" />
    </div>
  );
}
