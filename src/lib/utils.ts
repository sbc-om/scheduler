import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelative(ts: string | Date | null | undefined): string {
  if (!ts) return "—";
  const d = typeof ts === "string" ? new Date(ts) : ts;
  const diff = Date.now() - d.getTime();
  const abs = Math.abs(diff);
  const past = diff >= 0;
  if (abs < 60_000) return past ? "just now" : "soon";

  const minutes = Math.floor(abs / 60_000);
  const hours = Math.floor(abs / 3_600_000);
  const days = Math.floor(abs / 86_400_000);

  let label = "";
  if (minutes < 60) {
    label = `${minutes}m`;
  } else if (hours < 24) {
    const remainingMinutes = minutes % 60;
    label = remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  } else {
    const remainingHours = hours % 24;
    label = remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  return past ? `${label} ago` : `in ${label}`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${(Math.floor(ms / 1000) % 60)}s`;
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}
