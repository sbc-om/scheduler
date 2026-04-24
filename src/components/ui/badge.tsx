import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "success"
  | "warning"
  | "info";

const variants: Record<Variant, string> = {
  default:
    "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
  secondary:
    "bg-secondary text-secondary-foreground ring-1 ring-inset ring-border",
  outline: "text-foreground ring-1 ring-inset ring-border",
  destructive:
    "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
  success:
    "bg-success/10 text-success ring-1 ring-inset ring-success/25",
  warning:
    "bg-warning/10 text-warning ring-1 ring-inset ring-warning/25",
  info: "bg-info/10 text-info ring-1 ring-inset ring-info/25",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
