"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Workflow,
  CalendarClock,
  Activity,
  Bell,
  KeyRound,
  Settings,
  LogOut,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Orchestration",
    items: [
      { href: "/workflows", label: "Workflows", icon: Workflow },
      { href: "/schedules", label: "Schedules", icon: CalendarClock },
      { href: "/executions", label: "Executions", icon: Activity },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/api-keys", label: "API Keys", icon: KeyRound },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar({
  tenant,
  user,
  className,
  mobile,
  onNavigate,
  onClose,
}: {
  tenant: { name: string; slug: string };
  user: { email: string; fullName: string | null };
  className?: string;
  mobile?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const initial = (user.fullName ?? user.email).trim().charAt(0).toUpperCase();

  return (
    <aside
      className={cn(
        "panel-surface w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        mobile ? "flex h-full" : "hidden md:flex",
        className,
      )}
    >
      {/* Brand / workspace */}
      <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-5">
        <div
          className="relative grid h-10 w-10 place-items-center rounded-2xl text-white shadow-lg shadow-primary/20"
          style={{
            background:
              "linear-gradient(135deg, hsl(250 90% 68%), hsl(217 91% 60%))",
          }}
        >
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-tight text-sidebar-foreground">
            Scheduler
          </div>
          <div className="truncate text-[11px] leading-tight text-sidebar-foreground/60">
            {tenant.name}
          </div>
        </div>
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-sidebar-foreground/8 hover:text-sidebar-foreground"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-4 py-5">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/42">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all",
                        active
                          ? "bg-sidebar-active/10 text-sidebar-foreground ring-1 ring-sidebar-active/15"
                          : "text-sidebar-foreground/78 hover:bg-sidebar-foreground/6 hover:text-sidebar-foreground",
                      )}
                    >
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                          style={{
                            background:
                              "linear-gradient(180deg, hsl(250 90% 72%), hsl(217 91% 60%))",
                          }}
                        />
                      ) : null}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active
                            ? "text-sidebar-active"
                            : "text-sidebar-foreground/52 group-hover:text-sidebar-foreground",
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <form
        action="/api/auth/logout"
        method="post"
        className="border-t border-sidebar-border p-4"
        onSubmit={onNavigate}
      >
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/80 bg-sidebar-foreground/[0.03] px-3 py-3">
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
            style={{
              background:
                "linear-gradient(135deg, hsl(250 85% 60%), hsl(217 85% 50%))",
            }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-sidebar-foreground">
              {user.fullName ?? user.email.split("@")[0]}
            </div>
            <div className="text-[10.5px] text-sidebar-foreground/55 truncate">
              {user.email}
            </div>
          </div>
          <button
            type="submit"
            title="Sign out"
            className="grid h-8 w-8 place-items-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-foreground/8 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </form>
    </aside>
  );
}
