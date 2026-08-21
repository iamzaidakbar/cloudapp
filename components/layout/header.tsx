"use client";

import Link from "next/link";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { AdminMenu } from "@/components/layout/admin-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type {
  ConnectionStatus,
  VerificationSource,
} from "@/lib/generated/prisma/client";

type HeaderProps = {
  admin: { email: string; name: string | null };
  connectionStatus: ConnectionStatus | null;
  verificationSource: VerificationSource | null;
};

function awsStatusDisplay(
  status: ConnectionStatus | null,
  verificationSource: VerificationSource | null,
): { label: string; tone: StatusTone } {
  if (!status || status === "NOT_CONNECTED") {
    return { label: "Not connected", tone: "neutral" };
  }
  if (status === "FAILED") {
    return { label: "Failed", tone: "danger" };
  }
  if (verificationSource === "DEV_ADAPTER") {
    return { label: "Simulated", tone: "warning" };
  }
  return { label: "Connected", tone: "success" };
}

export function Header({
  admin,
  connectionStatus,
  verificationSource,
}: HeaderProps) {
  const aws = awsStatusDisplay(connectionStatus, verificationSource);

  return (
    <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-border bg-background">
      <div className="flex h-full w-full items-center gap-3 px-4 md:px-6 xl:px-8">
        <MobileSidebar />

        <Link
          href="/settings/aws"
          className="hidden min-w-0 items-center gap-2 sm:flex"
        >
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            AWS
          </span>
          <StatusBadge tone={aws.tone}>{aws.label}</StatusBadge>
        </Link>

        <div className="min-w-0 flex-1" />

        <div className="flex items-center gap-1 border border-border bg-card p-1">
          <ThemeToggle />
          <div className="h-5 w-px bg-border" />
          <AdminMenu admin={admin} variant="navbar" />
        </div>
      </div>
    </header>
  );
}
