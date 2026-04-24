"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, Copy, KeyRound, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const EXPIRY_PRESETS: { value: string; label: string; days: number | null }[] = [
  { value: "30", label: "30 days", days: 30 },
  { value: "90", label: "90 days", days: 90 },
  { value: "180", label: "180 days", days: 180 },
  { value: "365", label: "1 year", days: 365 },
  { value: "never", label: "Never", days: null },
];

export function NewKeyDialog({ variant = "primary" }: { variant?: "primary" | "ghost" } = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("90");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const preset = EXPIRY_PRESETS.find((p) => p.value === expiry);
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          expiresInDays: preset?.days ?? null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed to create key");
        return;
      }
      const j = await res.json();
      setCreated(j.key);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setOpen(false);
    setTimeout(() => {
      setCreated(null);
      setName("");
      setExpiry("90");
      setCopied(false);
    }, 200);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant === "ghost" ? "outline" : "default"}>
          <Plus className="h-4 w-4" />
          New API key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-4 w-4" />
            </span>
            {created ? "API key created" : "Create API key"}
          </DialogTitle>
          <DialogDescription>
            {created
              ? "Copy and store your key now. It will never be shown again."
              : "Name the key and choose when it should expire. You'll see the secret only once."}
          </DialogDescription>
        </DialogHeader>
        {created ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Secret key</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs">
                  {created}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(created);
                    setCopied(true);
                    toast.success("Copied");
                  }}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Treat this like a password. Store it in a secrets manager or
                environment variable — never commit it to source control.
              </span>
            </div>
            <DialogFooter>
              <Button onClick={reset}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Production worker"
                autoFocus
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Human-readable label shown in logs and the dashboard.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Expiration</Label>
              <Select
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              >
                {EXPIRY_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Rotate keys regularly. Short-lived keys are safer.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name.trim()}>
                {loading ? "Creating…" : "Create key"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
