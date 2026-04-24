"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { PushNotificationsBootstrap } from "@/components/app/push-notifications-bootstrap";

export function AppShell({
  children,
  tenant,
  user,
}: {
  children: React.ReactNode;
  tenant: { name: string; slug: string };
  user: { email: string; fullName: string | null };
}) {
  const pathname = usePathname();
  const isBuilderRoute = /^\/workflows\/[^/]+\/builder$/.test(pathname);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="app-bg shell-grid relative flex h-screen w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[6%] top-[8%] h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[10%] right-[8%] h-64 w-64 rounded-full bg-accent/60 blur-3xl dark:bg-accent/20" />
      </div>
      <PushNotificationsBootstrap />
      <div className="relative flex w-full gap-3 p-3 sm:gap-4 sm:p-4">
        <Sidebar tenant={tenant} user={user} className="rounded-[2rem]" />
      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close menu overlay"
          />
          <Sidebar
            tenant={tenant}
            user={user}
            mobile
            className="relative z-10 h-full max-w-[82vw] rounded-r-[2rem] shadow-2xl sm:max-w-[24rem]"
            onClose={() => setMobileSidebarOpen(false)}
            onNavigate={() => setMobileSidebarOpen(false)}
          />
        </div>
      ) : null}
      <div className="shell-frame relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[2rem] rounded-br-[0.85rem]">
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto px-2 pb-2 sm:px-3 sm:pb-3">
          <div
            className={
              isBuilderRoute
                ? "flex h-full min-h-full w-full flex-col pt-2 sm:pt-3"
                : "mx-auto flex w-full min-w-0 max-w-[1460px] flex-col gap-8 px-3 py-4 fade-in sm:px-5 sm:py-5 lg:px-6"
            }
          >
            {children}
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}