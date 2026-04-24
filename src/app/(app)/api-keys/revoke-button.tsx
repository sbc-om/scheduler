"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RevokeButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function revoke() {
    if (!confirm("Revoke this key? Requests using it will fail immediately.")) return;
    start(async () => {
      const res = await fetch(`/api/api-keys/${id}/revoke`, { method: "POST" });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      toast.success("Revoked");
      router.refresh();
    });
  }
  return (
    <Button variant="outline" size="sm" onClick={revoke} disabled={pending}>
      Revoke
    </Button>
  );
}
