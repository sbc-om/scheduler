"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function NotificationReadSync({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!hasUnread) {
      window.dispatchEvent(
        new CustomEvent("notifications:unread", { detail: { unread: 0 } }),
      );
      return;
    }

    let cancelled = false;

    async function syncReadState() {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok || cancelled) return;
      window.dispatchEvent(
        new CustomEvent("notifications:unread", { detail: { unread: 0 } }),
      );
      router.refresh();
    }

    void syncReadState();
    return () => {
      cancelled = true;
    };
  }, [hasUnread, router]);

  return null;
}