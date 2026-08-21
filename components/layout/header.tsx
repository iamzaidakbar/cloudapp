"use client";

import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type HeaderProps = {
  admin: { email: string; name: string | null };
};

export function Header({ admin }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 h-11 shrink-0 border-b border-border bg-background">
      <div className="mx-auto flex h-full w-full max-w-[90rem] items-center gap-3 px-4 md:px-6 xl:px-8">
        <MobileSidebar admin={admin} />
        <div className="min-w-0 flex-1" />
        <ThemeToggle />
      </div>
    </header>
  );
}
