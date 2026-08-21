"use client";

import { usePathname } from "next/navigation";
import { navItems } from "@/components/layout/nav-items";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type HeaderProps = {
  admin: { email: string; name: string | null };
};

function currentPageTitle(pathname: string) {
  const match = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.label ?? "CloudShift-G";
}

export function Header({ admin }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      <MobileSidebar admin={admin} />
      <h1 className="flex-1 text-sm font-semibold tracking-tight text-foreground md:text-base">
        {currentPageTitle(pathname)}
      </h1>
      <ThemeToggle />
    </header>
  );
}
