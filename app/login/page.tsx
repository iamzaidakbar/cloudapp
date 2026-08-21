import Link from "next/link";
import { Cloud } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { APP_NAME } from "@/lib/constants";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center border border-border bg-card">
            <Cloud className="size-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">{APP_NAME}</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage your AWS → GCP migration.
            </p>
          </div>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New organization?{" "}
          <Link
            href="/onboarding"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Start onboarding
          </Link>
        </p>
      </div>
    </div>
  );
}
