"use client";

import { useState } from "react";
import Link from "next/link";
import { Cloud, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { AdminMenu } from "@/components/layout/admin-menu";
import { APP_NAME } from "@/lib/constants";

type MobileSidebarProps = {
  admin: { email: string; name: string | null };
};

export function MobileSidebar({ admin }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" />} className="md:hidden">
        <Menu className="size-5" />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b">
          <SheetTitle className="text-base">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold"
              onClick={() => setOpen(false)}
            >
              <Cloud className="size-5 text-primary" />
              {APP_NAME}
            </Link>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>

        <div className="px-2 pb-2">
          <Separator className="mb-2" />
          <AdminMenu admin={admin} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
