"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="app-bg flex h-screen w-full overflow-hidden">
      <PushNotificationsBootstrap />
      <Sidebar tenant={tenant} user={user} />
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
            className="relative z-10 h-full max-w-[80vw] shadow-2xl sm:max-w-[24rem]"
            onClose={() => setMobileSidebarOpen(false)}
            onNavigate={() => setMobileSidebarOpen(false)}
          />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto">
          <div
            className={
              isBuilderRoute
                ? "flex h-full min-h-full w-full flex-col"
                : "mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-8 px-4 py-6 fade-in sm:px-6 sm:py-8 lg:px-8"
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}