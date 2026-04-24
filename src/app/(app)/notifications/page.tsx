import { requireSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listUserNotifications } from "@/modules/notifications/repository";

export default async function NotificationsPage() {
  const user = await requireSessionUser();
  const items = await listUserNotifications({
    tenantId: user.tenantId,
    userId: user.userId,
    limit: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="In-app alerts from workflow steps and runtime events." />
      <Card>
        <CardHeader>
          <CardTitle>Recent notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                <div className="text-sm font-medium">{item.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{item.message}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}