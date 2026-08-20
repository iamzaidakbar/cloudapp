import { Cloud } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { APP_NAME } from "@/lib/constants";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Cloud className="size-8 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage your AWS → GCP migration.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
