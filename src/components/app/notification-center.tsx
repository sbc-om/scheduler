"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

export function NotificationCenter() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadUnread() {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const json = (await res.json().catch(() => ({}))) as { unread?: number };
      if (!cancelled) {
        setUnread(typeof json.unread === "number" ? json.unread : 0);
      }
    }

    void loadUnread();

    function handleUnread(event: Event) {
      const customEvent = event as CustomEvent<{ unread?: number }>;
      setUnread(typeof customEvent.detail?.unread === "number" ? customEvent.detail.unread : 0);
    }

    window.addEventListener("notifications:unread", handleUnread as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("notifications:unread", handleUnread as EventListener);
    };
  }, [pathname]);

  return (
    <div className="relative">
      <Link
        href="/notifications"
        aria-label="Open notifications"
        className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-card text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <>
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 py-0.5 text-center text-[10px] font-semibold leading-none text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          </>
        ) : null}
      </Link>
    </div>
  );
}