import { requireSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { SettingsView } from "./settings-view";

export default async function SettingsPage() {
  const user = await requireSessionUser();
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsView
        me={{
          userId: user.userId,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          tenantName: user.tenantName,
          tenantSlug: user.tenantSlug,
          tenantId: user.tenantId,
        }}
      />
    </>
  );
}
