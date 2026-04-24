import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      tenant={{ name: user.tenantName, slug: user.tenantSlug }}
      user={{ email: user.email, fullName: user.fullName }}
    >
      {children}
    </AppShell>
  );
}
