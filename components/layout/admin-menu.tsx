"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AdminMenuProps = {
  admin: { email: string; name: string | null };
  variant?: "navbar" | "inline";
  className?: string;
};

function initialsFor(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
  return initials.join("") || "A";
}

export function AdminMenu({
  admin,
  variant = "navbar",
  className,
}: AdminMenuProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const initials = initialsFor(admin.name, admin.email);
  const displayName = admin.name || "Admin";

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          variant === "navbar"
            ? "flex items-center gap-2 px-1.5 py-1 hover:bg-muted"
            : "flex w-full items-center gap-2.5 px-2 py-2 text-left text-sm hover:bg-accent",
          className,
        )}
      >
        <Avatar size="sm" className="rounded-none after:rounded-none">
          <AvatarFallback className="rounded-none bg-muted text-[11px] font-medium text-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        {variant === "navbar" ? (
          <>
            <span className="hidden max-w-[9rem] truncate text-sm font-medium text-foreground md:inline">
              {displayName}
            </span>
            <ChevronDown className="hidden size-3.5 text-muted-foreground md:block" />
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="min-w-56">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium text-foreground">
            {displayName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isLoggingOut}
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          {isLoggingOut ? "Logging out…" : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
