import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { requireSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { queryOne } from "@/lib/db";
import { getMembership, listMembers } from "@/modules/tenants/repository";
import { MembersTable } from "./members-table";
import { AddMemberForm } from "./add-member-form";

export default async function TenantMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSessionUser();
  const membership = await getMembership(id, user.userId);
  if (!membership) notFound();

  const tenant = await queryOne<{
    id: string;
    name: string;
    slug: string;
    timezone: string;
    plan_code: string;
  }>(
    `SELECT id, name, slug, timezone, plan_code
       FROM tenants WHERE id = $1`,
    [id],
  );
  if (!tenant) notFound();

  const members = await listMembers(id);
  const canManage = membership.role === "owner" || membership.role === "admin";

  return (
    <>
      <PageHeader
        title={tenant.name}
        eyebrow="Organization"
        action={
          <Badge variant="info" className="capitalize">
            {membership.role}
          </Badge>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Members
            <span className="text-xs font-normal text-muted-foreground">
              {members.length}
            </span>
          </CardTitle>
          {canManage ? (
            <AddMemberForm tenantId={id} viewerRole={membership.role} />
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <MembersTable
            tenantId={id}
            members={members}
            viewerRole={membership.role}
            viewerUserId={user.userId}
          />
        </CardContent>
      </Card>
    </>
  );
}
