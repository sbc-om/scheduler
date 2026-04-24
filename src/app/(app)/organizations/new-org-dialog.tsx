"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Trigger + dialog that lets an authenticated user spin up a brand-new
 * organization. The caller becomes the owner of the new organization and the
 * current session is switched to it on success so they land inside it.
 */
export function NewOrganizationButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [timezone, setTimezone] = useState("");
  const [pending, start] = useTransition();

  function reset() {
    setName("");
    setSlug("");
    setTimezone("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      toast.error("Name is required");
      return;
    }
    start(async () => {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          slug: slug.trim() || undefined,
          timezone: timezone.trim() || undefined,
          switchTo: true,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        organization?: { id: string; name: string };
      };
      if (!res.ok || !json.organization) {
        toast.error(json.error ?? "Could not create organization");
        return;
      }
      toast.success(`${json.organization.name} created`);
      reset();
      setOpen(false);
      router.refresh();
      router.push("/dashboard");
    });
  }

  // Provide a sensible default timezone based on the user's browser, but keep
  // the field optional — the backend falls back to UTC when empty.
  const defaultTz =
    typeof Intl !== "undefined"
      ? (() => {
          try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
          } catch {
            return "";
          }
        })()
      : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
              maxLength={120}
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Leave empty to generate from name"
              maxLength={48}
              pattern="[a-z0-9][a-z0-9-]*[a-z0-9]?"
              autoComplete="off"
            />
            <p className="text-[11px] text-muted-foreground">
              Lowercase letters, numbers, and hyphens. Used in URLs and API
              references.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder={defaultTz || "UTC"}
              maxLength={80}
              autoComplete="off"
            />
          </div>
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
              {pending ? "Creating…" : "Create organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
