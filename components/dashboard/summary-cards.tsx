"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FormattedDateTime } from "@/components/shared/formatted-date-time";
import { StaggerItem } from "@/components/motion/stagger-list";

type SummaryData = {
  adminCount: number;
  lastLoginAt: string | null;
};

type SummaryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: SummaryData };

export function SummaryCards() {
  const [state, setState] = useState<SummaryState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/dashboard/summary");
        const body = await response.json();

        if (!response.ok || !body.success) {
          throw new Error(body.error ?? "Failed to load dashboard summary");
        }

        if (!cancelled) {
          setState({ status: "ready", data: body.data as SummaryData });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Something went wrong",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load dashboard data</AlertTitle>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StaggerItem index={0}>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="size-4" />
              Admin Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.status === "loading" ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-semibold">{state.data.adminCount}</p>
            )}
          </CardContent>
        </Card>
      </StaggerItem>

      <StaggerItem index={1}>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-4" />
              Last Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.status === "loading" ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <p className="text-sm font-medium">
                {state.data.lastLoginAt ? (
                  <FormattedDateTime value={state.data.lastLoginAt} />
                ) : (
                  "This is your first login"
                )}
              </p>
            )}
          </CardContent>
        </Card>
      </StaggerItem>
    </div>
  );
}
