import { AppBrand } from "@/components/layout/app-brand";
import { SidebarNav, SidebarSettingsLink } from "@/components/layout/sidebar-nav";

export function Sidebar() {
  return (
    <aside className="hidden w-[15.5rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex xl:w-64">
      <div className="flex h-14 shrink-0 items-center px-5">
        <AppBrand />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-1 pb-4 pt-1">
          <SidebarNav />
        </div>

        <div className="shrink-0 px-1 pb-3 pt-2">
          <div className="mx-2 mb-2 h-px bg-sidebar-border" />
          <SidebarSettingsLink />
        </div>
      </div>
    </aside>
  );
}
