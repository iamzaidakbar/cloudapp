import Link from "next/link";
import { Cloud } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { AdminMenu } from "@/components/layout/admin-menu";
import { APP_NAME } from "@/lib/constants";

type SidebarProps = {
  admin: { email: string; name: string | null };
};

export function Sidebar({ admin }: SidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-background md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Cloud className="size-5 text-primary" />
          <span className="tracking-tight">{APP_NAME}</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        <SidebarNav />
      </div>

      <div className="px-2 pb-2">
        <Separator className="mb-2" />
        <AdminMenu admin={admin} />
      </div>
    </aside>
  );
}
