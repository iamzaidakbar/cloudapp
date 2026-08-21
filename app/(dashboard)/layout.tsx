import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/login");
  }
  if (admin.role === "PLATFORM_OPERATOR") {
    redirect("/platform");
  }

  const { connection } = admin.tenantId
    ? await getTenantWithConnection(admin.tenantId)
    : { connection: null };

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          admin={admin}
          connectionStatus={connection?.status ?? null}
          verificationSource={connection?.verificationSource ?? null}
        />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[90rem] animate-in fade-in duration-200 px-4 py-4 md:px-6 md:py-5 xl:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
