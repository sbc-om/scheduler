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
  Building2,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/app/brand-mark";

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
      { href: "/organizations", label: "Organizations", icon: Building2 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar({
  tenant: _tenant,
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
        "sidebar-surface w-[17.5rem] shrink-0 flex-col border border-sidebar-border/80 bg-sidebar text-sidebar-foreground",
        mobile ? "flex h-full" : "hidden md:flex",
        className,
      )}
    >
      <div className="flex h-24 items-center gap-3 border-b border-sidebar-border/80 px-5">
        <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[1.35rem] bg-white/90 ring-1 ring-border/50 shadow-[0_16px_32px_-20px_rgba(15,23,42,0.45)] dark:bg-white/10 dark:ring-white/10">
          <BrandMark size={32} priority />
        </div>
        <div className="min-w-0 text-[13px] font-semibold uppercase tracking-[0.22em] leading-tight text-sidebar-foreground/72">
          Scheduler
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

      <nav className="scrollbar-thin flex-1 space-y-7 overflow-y-auto px-4 py-6">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/36">
              {group.label}
            </div>
            <ul className="space-y-1.5">
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
                      data-active={active}
                      className={cn(
                        "nav-tile group relative flex items-center gap-3 rounded-[1.1rem] px-3.5 py-3 text-[13px] font-medium transition-all",
                        active
                          ? "bg-sidebar-active/10 text-sidebar-foreground ring-1 ring-sidebar-active/20 shadow-[0_18px_30px_-24px_rgba(234,88,63,0.8)]"
                          : "text-sidebar-foreground/78 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active
                            ? "text-sidebar-active"
                            : "text-sidebar-foreground/48 group-hover:text-sidebar-foreground",
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                      {active ? (
                        <span className="ml-auto h-2 w-2 rounded-full bg-sidebar-active shadow-[0_0_0_4px_rgba(234,88,63,0.12)]" />
                      ) : null}
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
        className="border-t border-sidebar-border/80 p-4"
        onSubmit={onNavigate}
      >
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-sidebar-border/80 bg-sidebar-foreground/[0.03] px-3 py-3.5">
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
            style={{
              background:
                "linear-gradient(135deg, hsl(8 88% 58%), hsl(188 70% 44%))",
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
            className="grid h-8 w-8 place-items-center rounded-xl text-sidebar-foreground/60 transition-colors hover:bg-sidebar-foreground/8 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </form>
    </aside>
  );
}
