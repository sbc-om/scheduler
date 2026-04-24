import { requireSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, parsePagination } from "@/components/ui/pagination";
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock3,
  Mail,
  Siren,
  Workflow,
} from "lucide-react";
import {
  countUserNotifications,
  listUserNotifications,
} from "@/modules/notifications/repository";

function getNotificationVisual(title: string, message: string) {
  const text = `${title} ${message}`.toLowerCase();
  if (text.includes("failed") || text.includes("error") || text.includes("dead letter")) {
    return {
      icon: Siren,
      shell: "bg-destructive/10 text-destructive ring-destructive/20",
    };
  }
  if (text.includes("success") || text.includes("completed") || text.includes("delivered")) {
    return {
      icon: CheckCircle2,
      shell: "bg-success/10 text-success ring-success/20",
    };
  }
  if (text.includes("workflow") || text.includes("run") || text.includes("schedule")) {
    return {
      icon: Workflow,
      shell: "bg-primary/10 text-primary ring-primary/20",
    };
  }
  if (text.includes("email") || text.includes("mail")) {
    return {
      icon: Mail,
      shell: "bg-warning/10 text-warning ring-warning/20",
    };
  }
  if (text.includes("pending") || text.includes("queued") || text.includes("waiting")) {
    return {
      icon: Clock3,
      shell: "bg-info/10 text-info ring-info/20",
    };
  }
  if (text.includes("unread") || text.includes("new")) {
    return {
      icon: BellRing,
      shell: "bg-primary/10 text-primary ring-primary/20",
    };
  }
  return {
    icon: Bell,
    shell: "bg-muted text-foreground ring-border",
  };
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const user = await requireSessionUser();
  const { page, pageSize } = parsePagination(sp, { defaultSize: 20, maxSize: 100 });
  const [items, total] = await Promise.all([
    listUserNotifications({
      tenantId: user.tenantId,
      userId: user.userId,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    countUserNotifications({ tenantId: user.tenantId, userId: user.userId }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="In-app alerts from workflow steps and runtime events." />
      <Card>
        <CardHeader>
          <CardTitle>Recent notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          <div className="space-y-3 px-6 pt-4 pb-4">
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="card-hover flex items-start gap-3 rounded-2xl border border-border/60 bg-background/80 px-4 py-3.5"
                >
                  {(() => {
                    const visual = getNotificationVisual(item.title, item.message);
                    const Icon = visual.icon;
                    return (
                      <div
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ${visual.shell}`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium leading-5">{item.title}</div>
                      {!item.read_at ? (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.message}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {total > 0 ? (
            <Pagination
              basePath="/notifications"
              page={page}
              pageSize={pageSize}
              totalItems={total}
              preservedParams={sp}
              itemLabel="notifications"
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}