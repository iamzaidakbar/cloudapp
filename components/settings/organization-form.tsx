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
  updateOrganizationSchema,
  type UpdateOrganizationInput,
} from "@/lib/validation/settings";

type OrganizationFormProps = {
  initialName: string;
  readOnly?: boolean;
};

export function OrganizationForm({
  initialName,
  readOnly = false,
}: OrganizationFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: { name: initialName },
  });

  async function onSubmit(values: UpdateOrganizationInput) {
    setServerError(null);
    setSaved(false);

    const response = await fetch("/api/settings/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const body = await response.json();
    if (!response.ok || !body.success) {
      setServerError(body.error ?? "Something went wrong. Please try again.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <section className="border border-border bg-card p-4 md:p-5">
      <form
        className="flex max-w-md flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {readOnly ? (
          <Alert>
            <AlertDescription>
              Only Tenant Admins can rename the organization.
            </AlertDescription>
          </Alert>
        ) : null}

        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}
        {saved ? (
          <Alert>
            <AlertDescription>Organization updated.</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="orgName">Organization name</Label>
          <Input
            id="orgName"
            type="text"
            disabled={readOnly}
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </div>

        {!readOnly ? (
          <Button
            type="submit"
            className="w-fit"
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save organization"
            )}
          </Button>
        ) : null}
      </form>
    </section>
  );
}
