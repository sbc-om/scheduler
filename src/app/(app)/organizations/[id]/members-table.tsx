"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { TenantMember, TenantRole } from "@/modules/tenants/repository";

const ROLES: TenantRole[] = ["owner", "admin", "operator", "viewer"];

const ROLE_VARIANT: Record<TenantRole, Parameters<typeof Badge>[0]["variant"]> = {
  owner: "success",
  admin: "info",
  operator: "default",
  viewer: "secondary",
};

export function MembersTable({
  tenantId,
  members,
  viewerRole,
  viewerUserId,
}: {
  tenantId: string;
  members: TenantMember[];
  viewerRole: TenantRole;
  viewerUserId: string;
}) {
  if (members.length === 0) {
    return (
      <div className="px-6 py-14 text-center text-sm text-muted-foreground">
        No members yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-3 font-medium">User</th>
            <th className="px-5 py-3 font-medium">Role</th>
            <th className="px-5 py-3 font-medium">Joined</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <MemberRow
              key={m.user_id}
              tenantId={tenantId}
              member={m}
              viewerRole={viewerRole}
              isSelf={m.user_id === viewerUserId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberRow({
  tenantId,
  member,
  viewerRole,
  isSelf,
}: {
  tenantId: string;
  member: TenantMember;
  viewerRole: TenantRole;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const canEdit = viewerRole === "owner" || viewerRole === "admin";
  // An admin cannot modify an owner, and cannot promote others to owner.
  const canEditThis =
    canEdit &&
    (viewerRole === "owner" || member.role !== "owner") &&
    !isSelf;

  function updateRole(role: TenantRole) {
    start(async () => {
      const res = await fetch(
        `/api/organizations/${tenantId}/members/${member.user_id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ role }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Could not update role");
        return;
      }
      toast.success("Role updated");
      router.refresh();
    });
  }

  function remove() {
    if (
      !confirm(
        isSelf
          ? "Leave this organization?"
          : `Remove ${member.email} from this organization?`,
      )
    )
      return;
    start(async () => {
      const res = await fetch(
        `/api/organizations/${tenantId}/members/${member.user_id}`,
        { method: "DELETE" },
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Could not remove member");
        return;
      }
      toast.success(isSelf ? "You left this organization" : "Member removed");
      router.refresh();
    });
  }

  const initial = (member.full_name ?? member.email).trim().charAt(0).toUpperCase();
  const availableRoles =
    viewerRole === "owner"
      ? ROLES
      : (["admin", "operator", "viewer"] as TenantRole[]);

  return (
    <tr className="border-b border-border/40 last:border-b-0">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
            style={{
              background:
                "linear-gradient(135deg, hsl(46 100% 55%), hsl(36 100% 48%))",
            }}
          >
            {initial || "U"}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">
              {member.full_name ?? member.email.split("@")[0]}
              {isSelf ? (
                <span className="ml-1.5 text-[11px] text-muted-foreground">
                  (you)
                </span>
              ) : null}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {member.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        {canEditThis ? (
          <Select
            value={member.role}
            onChange={(e) => updateRole(e.target.value as TenantRole)}
            disabled={pending}
            className="h-8 w-[130px]"
          >
            {availableRoles.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r}
              </option>
            ))}
          </Select>
        ) : (
          <Badge variant={ROLE_VARIANT[member.role]} className="capitalize">
            {member.role}
          </Badge>
        )}
      </td>
      <td className="px-5 py-3 text-xs text-muted-foreground">
        {new Date(member.joined_at).toLocaleDateString()}
      </td>
      <td className="px-5 py-3 text-right">
        {canEditThis || isSelf ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={remove}
            disabled={pending}
            title={isSelf ? "Leave organization" : "Remove member"}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </td>
    </tr>
  );
}
