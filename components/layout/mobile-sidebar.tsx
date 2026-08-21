"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppBrand } from "@/components/layout/app-brand";
import {
  SidebarNav,
  SidebarSettingsLink,
} from "@/components/layout/sidebar-nav";
import { APP_NAME } from "@/lib/constants";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" />}
        className="lg:hidden"
      >
        <Menu className="size-5" />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-72 flex-col gap-0 bg-background p-0"
      >
        <SheetHeader className="space-y-0 p-3 text-left sm:p-4">
          <SheetTitle className="sr-only">{APP_NAME}</SheetTitle>
          <section className="border border-border bg-card px-4 py-3">
            <AppBrand onNavigate={() => setOpen(false)} />
          </section>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 sm:px-4">
          <div className="flex-1 overflow-y-auto py-1">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
          <div className="shrink-0 border-t border-border pt-3">
            <SidebarSettingsLink onNavigate={() => setOpen(false)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
