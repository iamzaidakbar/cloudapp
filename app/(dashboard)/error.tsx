"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center border border-border bg-card">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold tracking-tight">
          Failed to load this page
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Something went wrong while loading this view. Try again or return to
          the dashboard.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
