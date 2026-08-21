import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/guard";
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar admin={admin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header admin={admin} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl animate-in fade-in duration-200">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
