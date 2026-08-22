"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validation/auth";

type ChangePasswordFormProps = {
  forced?: boolean;
};

export function ChangePasswordForm({ forced = false }: ChangePasswordFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  async function onSubmit(values: ChangePasswordInput) {
    setServerError(null);

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const body = await response.json();

    if (!response.ok || !body.success) {
      setServerError(body.error ?? "Something went wrong. Please try again.");
      return;
    }

    const redirectTo =
      (body.data?.redirectTo as string | undefined) ?? "/dashboard";
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <section className="border border-border bg-card p-4 md:p-5">
      <form
        className="flex max-w-md flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {forced ? (
          <Alert>
            <AlertDescription>
              You must set a new password before continuing.
            </AlertDescription>
          </Alert>
        ) : null}

        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.currentPassword)}
            {...register("currentPassword")}
          />
          {errors.currentPassword ? (
            <p className="text-xs text-destructive">
              {errors.currentPassword.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword)}
            {...register("newPassword")}
          />
          {errors.newPassword ? (
            <p className="text-xs text-destructive">
              {errors.newPassword.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-fit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </section>
  );
}
