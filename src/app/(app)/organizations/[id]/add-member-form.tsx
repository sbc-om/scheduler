"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { TenantRole } from "@/modules/tenants/repository";

export function AddMemberForm({
  tenantId,
  viewerRole,
}: {
  tenantId: string;
  viewerRole: TenantRole;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<TenantRole>("operator");
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();

  function reset() {
    setEmail("");
    setFullName("");
    setRole("operator");
    setPassword("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) {
      toast.error("Password must be at least 10 characters");
      return;
    }
    start(async () => {
      const res = await fetch(`/api/organizations/${tenantId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          role,
          password,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Could not add member");
        return;
      }
      toast.success("Member added");
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  const availableRoles: TenantRole[] =
    viewerRole === "owner"
      ? ["owner", "admin", "operator", "viewer"]
      : ["admin", "operator", "viewer"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4" /> Add member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Optional"
              maxLength={120}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as TenantRole)}
              >
                {availableRoles.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Initial password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={10}
                autoComplete="new-password"
                required
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            If the email already belongs to an existing user, the password is
            ignored and only the membership is created.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
