"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConnectionSummary } from "@/components/aws/connection-summary";
import type { Tenant, AwsConnection } from "@/lib/generated/prisma/client";

type StepCompleteProps = {
  tenant: Tenant;
  connection: AwsConnection;
};

export function StepComplete({ tenant, connection }: StepCompleteProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-emerald-500" />
          {tenant.name} is connected
        </CardTitle>
        <CardDescription>
          CloudShift-G can now audit and compare this AWS account against GCP.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ConnectionSummary connection={connection} />
        <Button className="w-full" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
