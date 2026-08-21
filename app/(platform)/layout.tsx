import { redirect } from "next/navigation";
import Link from "next/link";
import { Cloud } from "lucide-react";
import { getCurrentAdmin } from "@/lib/auth/guard";
import { AdminMenu } from "@/components/layout/admin-menu";
import { APP_NAME } from "@/lib/constants";

// Deliberately minimal, no SidebarNav/nav-items.ts reuse — those are all
// tenant-feature links (Infrastructure, Audits, Comparisons, Migrations…)
// that don't apply to the Platform Operator's cross-tenant, credential-free
// view. This phase keeps the operator surface intentionally small (a tenant
// list, proving the role boundary works); a fuller operator dashboard is
// deferred to the hardening phase once two real tenants exist to observe.
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/login");
  }
  if (admin.role !== "PLATFORM_OPERATOR") {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
        <Link href="/platform" className="flex items-center gap-2 font-semibold">
          <Cloud className="size-5 text-primary" />
          <span className="tracking-tight">{APP_NAME}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Platform Operator
          </span>
        </Link>
        <div className="w-56">
          <AdminMenu admin={admin} />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">{children}</main>
    </div>
  );
}
