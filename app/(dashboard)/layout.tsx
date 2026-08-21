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
    <>
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_20%_-10%,var(--glass-bg-subtle),transparent)]"
        aria-hidden="true"
      />
      <div className="flex h-screen overflow-hidden">
        <Sidebar admin={admin} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header admin={admin} />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
