"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { AwsConnection } from "@/lib/generated/prisma/client";

type StepVerifyProps = {
  connection: AwsConnection;
  onVerified: (connection: AwsConnection) => void;
  onEditRole: () => void;
};

export function StepVerify({ connection, onVerified, onEditRole }: StepVerifyProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(connection.lastVerificationError);

  async function handleVerify() {
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch("/api/aws/connection/verify", { method: "POST" });
      const body = await response.json();

      if (!response.ok || !body.success) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }

      const updated = body.data.connection as AwsConnection;
      if (body.data.verified) {
        onVerified(updated);
      } else {
        setError(updated.lastVerificationError ?? "Verification failed.");
      }
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Connection</CardTitle>
        <CardDescription>
          CloudShift-G will assume the role below to confirm access before saving it.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Role ARN</dt>
          <dd className="truncate font-mono text-xs">{connection.roleArn}</dd>
          <dt className="text-muted-foreground">External ID</dt>
          <dd className="truncate font-mono text-xs">{connection.externalId}</dd>
        </dl>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Verification failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onEditRole} disabled={isVerifying}>
            Edit role
          </Button>
          <Button type="button" className="flex-1" onClick={handleVerify} disabled={isVerifying}>
            {isVerifying ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Verifying…
              </>
            ) : error ? (
              "Try Again"
            ) : (
              "Verify Connection"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
