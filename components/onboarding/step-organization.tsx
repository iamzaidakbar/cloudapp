"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { registerSchema, type RegisterInput } from "@/lib/validation/onboarding";
import type { Tenant, AwsConnection } from "@/lib/generated/prisma/client";

type StepOrganizationProps = {
  onCreated: (result: { tenant: Tenant; connection: AwsConnection }) => void;
};

export function StepOrganization({ onCreated }: StepOrganizationProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await response.json();

    if (!response.ok || !body.success) {
      setServerError(body.error ?? "Something went wrong. Please try again.");
      return;
    }

    onCreated(body.data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register your organization</CardTitle>
        <CardDescription>
          Create your organization and its first Tenant Admin account — the admin who connects your AWS account
          and approves migrations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError ? (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="organizationName">Organization name</Label>
            <Input
              id="organizationName"
              placeholder="Acme Corp"
              aria-invalid={Boolean(errors.organizationName)}
              {...register("organizationName")}
            />
            {errors.organizationName ? (
              <p className="text-xs text-destructive">{errors.organizationName.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adminName">Your name</Label>
            <Input id="adminName" placeholder="Jane Doe" {...register("adminName")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adminEmail">Your email</Label>
            <Input
              id="adminEmail"
              type="email"
              placeholder="jane@acme.com"
              aria-invalid={Boolean(errors.adminEmail)}
              {...register("adminEmail")}
            />
            {errors.adminEmail ? (
              <p className="text-xs text-destructive">{errors.adminEmail.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adminPassword">Password</Label>
            <Input
              id="adminPassword"
              type="password"
              aria-invalid={Boolean(errors.adminPassword)}
              {...register("adminPassword")}
            />
            {errors.adminPassword ? (
              <p className="text-xs text-destructive">{errors.adminPassword.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
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
