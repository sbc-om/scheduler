"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { NotificationCenter } from "./notification-center";
import { ThemeToggle } from "./theme-toggle";

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const currentLabel = parts.length === 0 ? "Home" : titleCase(parts[parts.length - 1]);

  return (
    <header className="sticky top-0 z-20 px-2 pt-2 sm:px-3 sm:pt-3">
      <div className="topbar-surface flex min-w-0 items-center gap-3 overflow-hidden rounded-[1.5rem] border border-border/70 px-4 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.28)] sm:gap-4 sm:px-5">
      <button
        type="button"
        onClick={onMenuClick}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border/80 bg-card/80 text-muted-foreground transition-colors hover:text-foreground md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-semibold tracking-[-0.02em] sm:text-[1.15rem]">
          {currentLabel}
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <NotificationCenter />
        <ThemeToggle />
      </div>
      </div>
    </header>
  );
}
