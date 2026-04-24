import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * App brand mark. Uses /logo.png as the single source of truth for the
 * application identity across the entire UI (sidebar, auth pages, etc.).
 */
export function BrandMark({
  size = 40,
  className,
  priority,
  alt = "Scheduler",
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    <Image
      src="/logo.png"
      width={size}
      height={size}
      alt={alt}
      priority={priority}
      className={cn("object-contain select-none", className)}
      draggable={false}
    />
  );
}
