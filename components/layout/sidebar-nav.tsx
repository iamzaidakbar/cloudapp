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
        "flex items-center gap-2.5 px-2.5 py-2 text-sm transition-colors",
        isActive
          ? "border border-border bg-card font-semibold text-foreground"
          : "border border-transparent font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
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
    <div className="flex flex-col gap-1.5">
      <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-5">
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
    <nav>
      <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Account
      </p>
      <NavLink item={settingsNavItem} onNavigate={onNavigate} />
    </nav>
  );
}
