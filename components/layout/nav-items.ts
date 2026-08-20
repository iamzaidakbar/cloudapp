import {
  LayoutDashboard,
  Server,
  ClipboardCheck,
  GitCompare,
  ArrowRightLeft,
  ListChecks,
  FileClock,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Infrastructure", href: "/infrastructure", icon: Server },
  { label: "Audits", href: "/audits", icon: ClipboardCheck },
  { label: "Comparisons", href: "/comparisons", icon: GitCompare },
  { label: "Migrations", href: "/migrations", icon: ArrowRightLeft },
  { label: "Jobs", href: "/jobs", icon: ListChecks },
  { label: "Audit Log", href: "/audit-log", icon: FileClock },
  { label: "Settings", href: "/settings", icon: Settings },
];
