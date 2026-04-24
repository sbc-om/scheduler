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
  const units: [number, string][] = [
    [60_000, "s"],
    [3_600_000, "m"],
    [86_400_000, "h"],
    [604_800_000, "d"],
  ];
  if (abs < units[0][0]) return past ? "just now" : "soon";
  let label = "";
  if (abs < units[1][0]) label = `${Math.floor(abs / 1000)}s`;
  else if (abs < units[2][0]) label = `${Math.floor(abs / 60_000)}m`;
  else if (abs < units[3][0]) label = `${Math.floor(abs / 3_600_000)}h`;
  else label = `${Math.floor(abs / 86_400_000)}d`;
  return past ? `${label} ago` : `in ${label}`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${(Math.floor(ms / 1000) % 60)}s`;
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}
