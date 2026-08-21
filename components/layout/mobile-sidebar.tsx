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
      <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4">
          <SheetTitle className="text-left">
            <AppBrand onNavigate={() => setOpen(false)} />
          </SheetTitle>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-1 pb-4">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
          <div className="shrink-0 px-1 pb-3 pt-2">
            <div className="mx-2 mb-2 h-px bg-border" />
            <SidebarSettingsLink onNavigate={() => setOpen(false)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
