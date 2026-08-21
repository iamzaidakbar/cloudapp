"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionSummary } from "@/components/aws/connection-summary";
import type { Tenant, AwsConnection } from "@/lib/generated/prisma/client";

type StepCompleteProps = {
  tenant: Tenant;
  connection: AwsConnection;
};

export function StepComplete({ tenant, connection }: StepCompleteProps) {
  const router = useRouter();

  return (
    <section className="border border-border bg-card">
      <div className="border-b border-border px-4 py-3 md:px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-success">
          <CheckCircle2 className="size-4" />
          {tenant.name} is connected
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          CloudShift-G can now audit and compare this AWS account against GCP.
        </p>
      </div>
      <div className="flex flex-col gap-4 p-4 md:p-5">
        <ConnectionSummary connection={connection} />
        <Button className="w-full" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    </section>
  );
}
