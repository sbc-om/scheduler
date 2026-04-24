"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Search } from "lucide-react";
import { NotificationCenter } from "./notification-center";
import { ThemeToggle } from "./theme-toggle";

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = parts.map((part, idx) => {
    const href = "/" + parts.slice(0, idx + 1).join("/");
    const label =
      part.length > 16 && /^[0-9a-f-]{8,}$/i.test(part)
        ? part.slice(0, 8)
        : titleCase(part);
    return { href, label };
  });

  return (
    <header className="sticky top-0 z-20 flex h-14 min-w-0 items-center gap-3 overflow-hidden border-b border-border bg-background/75 px-4 backdrop-blur-md sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>
      <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-sm">
        {crumbs.length === 0 ? (
          <span className="text-muted-foreground">Home</span>
        ) : (
          crumbs.map((c, i) => (
            <div key={c.href} className="flex items-center gap-1 min-w-0">
              {i > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              ) : null}
              {i === crumbs.length - 1 ? (
                <span className="font-medium truncate">{c.label}</span>
              ) : (
                <Link
                  href={c.href}
                  className="text-muted-foreground hover:text-foreground truncate"
                >
                  {c.label}
                </Link>
              )}
            </div>
          ))
        )}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="hidden lg:flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 w-72 text-sm text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 truncate">Search workflows, runs…</span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-px text-[10px] font-mono">
            ⌘K
          </kbd>
        </div>
        <NotificationCenter />
        <ThemeToggle />
      </div>
    </header>
  );
}
