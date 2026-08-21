"use client";

import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { AdminMenu } from "@/components/layout/admin-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type HeaderProps = {
  admin: { email: string; name: string | null };
};

export function Header({ admin }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-border bg-background">
      <div className="flex h-full w-full items-center gap-3 px-4 md:px-6 xl:px-8">
        <MobileSidebar />
        <div className="min-w-0 flex-1" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AdminMenu admin={admin} variant="navbar" />
        </div>
      </div>
    </header>
  );
}
