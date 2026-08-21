import { AppBrand } from "@/components/layout/app-brand";
import { SidebarNav, SidebarSettingsLink } from "@/components/layout/sidebar-nav";

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-background text-foreground lg:flex xl:w-64">
      <div className="shrink-0 p-3 xl:p-4">
        <section className="border border-border bg-card px-4 py-3">
          <AppBrand />
        </section>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 xl:px-4">
        <div className="flex-1 overflow-y-auto py-1">
          <SidebarNav />
        </div>

        <div className="shrink-0 border-t border-border pt-3">
          <SidebarSettingsLink />
        </div>
      </div>
    </aside>
  );
}
