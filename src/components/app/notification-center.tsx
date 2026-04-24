"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

export function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function loadNotifications() {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { items: NotificationItem[]; unread: number };
    setItems(json.items.slice(0, 5));
    setUnread(json.unread);
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    setUnread((count) => Math.max(0, count - 1));
  }

  return (
    <div className="relative">
      <details className="group">
        <summary className="list-none">
          <button
            type="button"
            className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-card text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
            ) : null}
          </button>
        </summary>
        <div className="panel-surface absolute right-0 top-11 z-30 w-96 rounded-2xl border border-border/70 p-2 shadow-xl">
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <div className="text-sm font-semibold">Notifications</div>
              <div className="text-xs text-muted-foreground">In-app workflow activity</div>
            </div>
            <Link href="/notifications" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="max-h-96 space-y-1 overflow-y-auto p-1 scrollbar-thin">
            {items.length === 0 ? (
              <div className="rounded-xl px-3 py-6 text-center text-sm text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => markRead(item.id)}
                  className="flex w-full flex-col rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    {!item.read_at ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground">{item.message}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </details>
    </div>
  );
}