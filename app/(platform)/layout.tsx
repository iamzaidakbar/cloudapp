import { redirect } from "next/navigation";
import Link from "next/link";
import { Cloud } from "lucide-react";
import { getCurrentAdmin } from "@/lib/auth/guard";
import { AdminMenu } from "@/components/layout/admin-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { APP_NAME } from "@/lib/constants";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/login");
  }
  if (admin.mustChangePassword) {
    redirect("/settings/password");
  }
  if (admin.role !== "PLATFORM_OPERATOR") {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
        <Link
          href="/platform"
          className="flex items-center gap-2.5 font-semibold tracking-tight"
        >
          <Cloud className="size-5" />
          <span>{APP_NAME}</span>
          <span className="border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Platform Operator
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <div className="mx-0.5 hidden h-5 w-px bg-border sm:block" />
          <AdminMenu admin={admin} variant="navbar" />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
