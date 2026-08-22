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
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validation/settings";

type ProfileFormProps = {
  initialName: string;
  email: string;
};

export function ProfileForm({ initialName, email }: ProfileFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: initialName },
  });

  async function onSubmit(values: UpdateProfileInput) {
    setServerError(null);
    setSaved(false);

    const response = await fetch("/api/me", {
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
        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}
        {saved ? (
          <Alert>
            <AlertDescription>Profile updated.</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} disabled readOnly />
          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </div>

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
            "Save profile"
          )}
        </Button>
      </form>
    </section>
  );
}
