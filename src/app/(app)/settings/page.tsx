import { requireSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default async function SettingsPage() {
  const user = await requireSessionUser();
  return (
    <>
      <PageHeader title="Settings" />
      <Card>
        <CardContent className="p-6 space-y-4 text-sm">
          <Row k="Tenant name" v={user.tenantName} />
          <Row k="Tenant slug" v={user.tenantSlug} mono />
          <Row k="Your role" v={user.role} />
          <Row k="Email" v={user.email} mono />
        </CardContent>
      </Card>
    </>
  );
}

function Row({
  k,
  v,
  mono,
}: {
  k: string;
  v: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-muted-foreground">{k}</div>
      <div className={mono ? "font-mono" : ""}>{v}</div>
    </div>
  );
}
