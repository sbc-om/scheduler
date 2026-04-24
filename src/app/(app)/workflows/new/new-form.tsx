"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function NewWorkflowForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          code: code || slugify(name),
          description,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed to create workflow");
        return;
      }
      const j = await res.json();
      toast.success("Workflow created");
      router.push(`/workflows/${j.id}/builder`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!code) setCode(slugify(e.target.value));
              }}
              placeholder="Nightly report generator"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(slugify(e.target.value))}
              placeholder="nightly-report"
              required
            />
            <p className="text-xs text-muted-foreground">
              Unique per tenant. Used in APIs and webhooks.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
            />
          </div>
          <div className="flex justify-end">
            <Button disabled={loading || !name}>
              {loading ? "Creating…" : "Create workflow"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
