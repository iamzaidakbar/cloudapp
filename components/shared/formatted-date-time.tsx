"use client";

import { useSyncExternalStore } from "react";
import { formatDateTime } from "@/lib/format";

function subscribe() {
  return () => {};
}

function formatLocal(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

// Server and the client's first render must produce identical HTML (React
// hydration requirement), but the viewer's timezone is only known in the
// browser. useSyncExternalStore's getServerSnapshot covers both the actual
// server render and React's pre-hydration client pass (fixed-UTC, matching
// lib/format.ts), then getSnapshot takes over for the real client render
// (viewer's local timezone) — no post-mount setState/effect needed.
export function FormattedDateTime({ value }: { value: Date | string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => formatLocal(value),
    () => formatDateTime(value),
  );

  return <>{text}</>;
}
