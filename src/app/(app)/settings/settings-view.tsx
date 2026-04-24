"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Me = {
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  tenantName: string;
  tenantSlug: string;
  tenantId: string;
};

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "workspace", label: "Workspace" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsView({ me }: { me: Me }) {
  const [tab, setTab] = useState<TabId>("profile");

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="flex h-max flex-row gap-1 rounded-xl border border-border/70 bg-card p-1 lg:flex-col">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              "flex-1 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors lg:flex-none " +
              (tab === t.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 space-y-6">
        {tab === "profile" && <ProfileTab me={me} />}
        {tab === "security" && <SecurityTab />}
        {tab === "workspace" && <WorkspaceTab me={me} />}
      </div>
    </div>
  );
}

function ProfileTab({ me }: { me: Me }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(me.fullName ?? "");
  const [email, setEmail] = useState(me.email);
  const [pending, start] = useTransition();

  const dirty = fullName !== (me.fullName ?? "") || email !== me.email;

  function save() {
    start(async () => {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim() || null, email }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Could not update profile");
        return;
      }
      toast.success("Profile updated");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="flex items-center gap-4">
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-semibold text-white"
            style={{
              background:
                "linear-gradient(135deg, hsl(250 85% 60%), hsl(217 85% 50%))",
            }}
          >
            {(fullName || email).trim().charAt(0).toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {fullName || email}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {me.email}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jane Doe"
              maxLength={120}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
        </div>
        <div className="flex justify-end border-t border-border/60 pt-4">
          <Button disabled={!dirty || pending} onClick={save}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityTab() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 10) {
      toast.error("New password must be at least 10 characters");
      return;
    }
    if (next !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    start(async () => {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Could not change password");
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password updated. Other sessions were signed out.");
    });
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <Field label="Current password">
            <Input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" hint="At least 10 characters">
              <Input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                minLength={10}
                required
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="flex justify-end border-t border-border/60 pt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Updating…" : "Update password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function WorkspaceTab({ me }: { me: Me }) {
  const router = useRouter();
  const canEdit = me.role === "owner" || me.role === "admin";
  const [name, setName] = useState(me.tenantName);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await fetch(`/api/organizations/${me.tenantId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Could not save workspace");
        return;
      }
      toast.success("Workspace updated");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Workspace name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              maxLength={120}
            />
          </Field>
          <Field label="Slug" hint="Stable identifier used in URLs">
            <Input value={me.tenantSlug} readOnly disabled className="font-mono" />
          </Field>
          <Field label="Your role">
            <div className="flex h-10 items-center">
              <Badge variant="info" className="capitalize">
                {me.role}
              </Badge>
            </div>
          </Field>
          <Field label="Organization ID">
            <Input value={me.tenantId} readOnly disabled className="font-mono text-xs" />
          </Field>
        </div>
        {canEdit ? (
          <div className="flex justify-end border-t border-border/60 pt-4">
            <Button
              disabled={pending || name === me.tenantName}
              onClick={save}
            >
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Only owners and admins can edit workspace details.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
