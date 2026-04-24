import Link from "next/link";
import { Users, ArrowRight, Check } from "lucide-react";
import { requireSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listUserTenants } from "@/modules/tenants/repository";
import { SwitchTenantButton } from "./switch-button";
import { NewOrganizationButton } from "./new-org-dialog";

export default async function TenantsPage() {
  const user = await requireSessionUser();
  const tenants = await listUserTenants(user.userId);

  return (
    <>
      <PageHeader
        title="Organizations"
        action={<NewOrganizationButton />}
      />
      {tenants.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              title="No organizations"
              description="You don't belong to any organization yet. Create one to get started."
              action={<NewOrganizationButton />}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tenants.map((t) => {
            const current = t.id === user.tenantId;
            return (
              <Card key={t.id} className="overflow-hidden">
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold tracking-tight">
                          {t.name}
                        </h3>
                        {current ? (
                          <Badge variant="success" className="gap-1">
                            <Check className="h-3 w-3" /> Active
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {t.slug}
                      </div>
                    </div>
                    <Badge variant="info" className="shrink-0 capitalize">
                      {t.role}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {t.member_count}{" "}
                      {t.member_count === 1 ? "member" : "members"}
                    </span>
                    <span className="capitalize">Plan: {t.plan_code}</span>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-4">
                    <Link
                      href={`/organizations/${t.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      Manage members
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    {current ? null : <SwitchTenantButton tenantId={t.id} />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
