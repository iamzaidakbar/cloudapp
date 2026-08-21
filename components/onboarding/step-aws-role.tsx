"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CopyButton } from "@/components/copy-button";
import { roleArnSchema, type RoleArnInput } from "@/lib/validation/aws-connection";
import type { AwsConnection } from "@/lib/generated/prisma/client";

type AppIdentity = { accountId: string; arn: string } | null;

type StepAwsRoleProps = {
  connection: AwsConnection;
  onSaved: (connection: AwsConnection) => void;
};

export function StepAwsRole({ connection, onSaved }: StepAwsRoleProps) {
  const [appIdentity, setAppIdentity] = useState<AppIdentity>(null);
  const [loadingIdentity, setLoadingIdentity] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/aws/connection")
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled && body.success) {
          setAppIdentity(body.data.appIdentity);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingIdentity(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RoleArnInput>({
    resolver: zodResolver(roleArnSchema),
    defaultValues: { roleArn: connection.roleArn ?? "" },
  });

  async function onSubmit(values: RoleArnInput) {
    setServerError(null);

    const response = await fetch("/api/aws/connection", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await response.json();

    if (!response.ok || !body.success) {
      setServerError(body.error ?? "Something went wrong. Please try again.");
      return;
    }

    onSaved(body.data.connection);
  }

  const trustPolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: appIdentity?.arn ?? "<connect AWS credentials to CloudShift-G to see this>" },
        Action: "sts:AssumeRole",
        Condition: { StringEquals: { "sts:ExternalId": connection.externalId } },
      },
    ],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AWS Role</CardTitle>
        <CardDescription>
          Create a read-only IAM role in your AWS account that trusts CloudShift-G, then paste its ARN below.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!loadingIdentity && !appIdentity ? (
          <Alert>
            <AlertDescription>
              CloudShift-G has no AWS credentials configured yet, so the Principal below is a
              placeholder. Verification will use a simulated dev adapter until real AWS
              credentials are added.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label>External ID</Label>
          <div className="flex items-center gap-1 border border-border bg-muted/40 px-2.5 py-1.5">
            <code className="flex-1 truncate font-mono text-xs">{connection.externalId}</code>
            <CopyButton value={connection.externalId} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Trust policy</Label>
          <pre className="overflow-x-auto border border-border bg-muted/40 p-2.5 font-mono text-xs">
            {JSON.stringify(trustPolicy, null, 2)}
          </pre>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError ? (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roleArn">Role ARN</Label>
            <Input
              id="roleArn"
              className="font-mono text-xs"
              placeholder="arn:aws:iam::123456789012:role/CloudShiftGRole"
              aria-invalid={Boolean(errors.roleArn)}
              {...register("roleArn")}
            />
            {errors.roleArn ? (
              <p className="text-xs text-destructive">{errors.roleArn.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
