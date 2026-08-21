"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  navItems,
  settingsNavItem,
  type NavItem,
} from "@/components/layout/nav-items";

const WORKFLOW = navItems.slice(0, 5);
const MONITOR = navItems.slice(5);

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-[13px] transition-colors",
        isActive
          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
          : "font-medium text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
      )}
    >
      <Icon className="size-[18px] shrink-0 opacity-80" strokeWidth={1.75} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavGroup({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-3 pb-1 text-[11px] font-medium text-muted-foreground/80">
        {label}
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-6 px-2">
      <NavGroup label="Workflow" items={WORKFLOW} onNavigate={onNavigate} />
      <NavGroup label="Monitor" items={MONITOR} onNavigate={onNavigate} />
    </nav>
  );
}

export function SidebarSettingsLink({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  return (
    <nav className="px-2">
      <NavLink item={settingsNavItem} onNavigate={onNavigate} />
    </nav>
  );
}
