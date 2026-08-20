"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function PlanActions({ migrationPlanId }: { migrationPlanId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "approve" | "cancel") {
    setPending(action);
    setError(null);

    const response = await fetch(`/api/migrations/${migrationPlanId}/${action}`, { method: "POST" });
    const body = await response.json();

    if (!response.ok || !body.success) {
      setError(body.error ?? "Something went wrong. Please try again.");
      setPending(null);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => handleAction("approve")} disabled={pending !== null}>
          {pending === "approve" ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          Approve Migration
        </Button>
        <Button type="button" variant="outline" onClick={() => handleAction("cancel")} disabled={pending !== null}>
          {pending === "cancel" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
          Cancel Plan
        </Button>
      </div>
      {error ? (
        <Alert variant="destructive" className="max-w-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
