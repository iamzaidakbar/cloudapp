import Link from "next/link";
import { Cloud } from "lucide-react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { AdminMenu } from "@/components/layout/admin-menu";
import { APP_NAME } from "@/lib/constants";

type SidebarProps = {
  admin: { email: string; name: string | null };
};

export function Sidebar({ admin }: SidebarProps) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex xl:w-60">
      <div className="flex h-11 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3 xl:px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <Cloud className="size-4" />
          <span className="text-sm">{APP_NAME}</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        <SidebarNav />
      </div>

      <div className="border-t border-sidebar-border px-2 py-2">
        <AdminMenu admin={admin} />
      </div>
    </aside>
  );
}
