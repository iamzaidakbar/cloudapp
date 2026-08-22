"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CloudOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/empty-state";
import { ViewOnlyBanner } from "@/components/shared/view-only-banner";
import { ConnectionStatusBadge } from "@/components/aws/connection-status-badge";
import { ConnectionSummary } from "@/components/aws/connection-summary";
import type { Tenant, AwsConnection } from "@/lib/generated/prisma/client";

type AwsConnectionPanelProps = {
  initialTenant: Tenant | null;
  initialConnection: AwsConnection | null;
  canWrite?: boolean;
};

export function AwsConnectionPanel({
  initialTenant,
  initialConnection,
  canWrite = true,
}: AwsConnectionPanelProps) {
  const router = useRouter();
  const [tenant] = useState(initialTenant);
  const [connection, setConnection] = useState(initialConnection);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [roleArnInput, setRoleArnInput] = useState(connection?.roleArn ?? "");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!tenant) {
    return (
      <EmptyState
        icon={CloudOff}
        title="No organization configured"
        description="Complete onboarding to create your organization and connect an AWS account."
      />
    );
  }

  function applyVerifiedConnection(next: AwsConnection, verified: boolean) {
    setConnection(next);
    if (verified) {
      setActionError(null);
      setActionSuccess("AWS connection verified successfully. CloudShift-G can assume your role.");
      toast.success("AWS connection verified");
      router.refresh();
      return;
    }
    setActionSuccess(null);
    setActionError(next.lastVerificationError ?? "Verification failed.");
  }

  async function verify() {
    setIsVerifying(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await fetch("/api/aws/connection/verify", { method: "POST" });
      const body = await response.json();
      if (!response.ok || !body.success) {
        setActionError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      applyVerifiedConnection(body.data.connection, Boolean(body.data.verified));
    } finally {
      setIsVerifying(false);
    }
  }

  async function saveRoleArn() {
    setIsVerifying(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const patchResponse = await fetch("/api/aws/connection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleArn: roleArnInput }),
      });
      const patchBody = await patchResponse.json();
      if (!patchResponse.ok || !patchBody.success) {
        setActionError(patchBody.error ?? "Something went wrong. Please try again.");
        return;
      }
      setConnection(patchBody.data.connection);
      setIsReconnecting(false);

      const verifyResponse = await fetch("/api/aws/connection/verify", { method: "POST" });
      const verifyBody = await verifyResponse.json();
      if (verifyResponse.ok && verifyBody.success) {
        applyVerifiedConnection(verifyBody.data.connection, Boolean(verifyBody.data.verified));
      } else {
        setActionError(verifyBody.error ?? "Something went wrong. Please try again.");
      }
    } finally {
      setIsVerifying(false);
    }
  }

  if (!connection?.roleArn) {
    return (
      <div className="flex flex-col gap-3">
        {!canWrite ? (
          <ViewOnlyBanner message="View only · Ask a Tenant Admin to connect AWS." />
        ) : null}
        <EmptyState
          icon={CloudOff}
          title="AWS not connected yet"
          description={
            canWrite
              ? "Connect an AWS account so CloudShift-G can audit infrastructure and plan migrations."
              : "A Tenant Admin must connect an AWS account before audits and migrations can run."
          }
        >
          {canWrite ? (
            <Button className="mt-2" onClick={() => router.push("/onboarding")}>
              Connect AWS Account
            </Button>
          ) : null}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!canWrite ? (
        <ViewOnlyBanner message="View only · Tenant Admins can verify or reconnect AWS." />
      ) : null}
      <section className="border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight">Connection status</h2>
            <p className="truncate text-xs text-muted-foreground">{tenant.name}</p>
          </div>
          <ConnectionStatusBadge status={connection.status} />
        </div>
        <div className="flex flex-col gap-4 p-4 md:p-5">
          {actionSuccess ? (
            <Alert variant="success">
              <CheckCircle2 />
              <AlertTitle>Connection verified</AlertTitle>
              <AlertDescription>{actionSuccess}</AlertDescription>
            </Alert>
          ) : null}

          {actionError ? (
            <Alert variant="destructive">
              <AlertTitle>{connection.status === "FAILED" ? "Verification failed" : "Error"}</AlertTitle>
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}

          <ConnectionSummary connection={connection} />

          {canWrite ? (
            isReconnecting ? (
              <div className="flex flex-col gap-2 border border-border p-3">
                <Label htmlFor="reconnect-role-arn">New Role ARN</Label>
                <Input
                  id="reconnect-role-arn"
                  className="font-mono text-xs"
                  value={roleArnInput}
                  onChange={(event) => setRoleArnInput(event.target.value)}
                  placeholder="arn:aws:iam::123456789012:role/CloudShiftGRole"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsReconnecting(false);
                      setRoleArnInput(connection.roleArn ?? "");
                    }}
                    disabled={isVerifying}
                  >
                    Cancel
                  </Button>
                  <Button type="button" className="flex-1" onClick={saveRoleArn} disabled={isVerifying}>
                    {isVerifying ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save & Verify"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button type="button" onClick={verify} disabled={isVerifying}>
                  {isVerifying ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify Connection"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsReconnecting(true)}>
                  Reconnect
                </Button>
              </div>
            )
          ) : null}
        </div>
      </section>
    </div>
  );
}
