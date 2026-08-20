// Explicit locale + UTC timezone so server-rendered HTML and the client's
// hydration pass always compute the identical string — omitting either
// lets Node's runtime locale/timezone diverge from the browser's and
// produces a React hydration mismatch for any timestamp rendered from a
// server-fetched prop.
export function formatDateTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
}

// Same fixed-locale reasoning as formatDateTime — Intl.NumberFormat's output
// can also vary by runtime locale, so this is pinned to en-US/USD regardless
// of where it renders.
export function formatCurrency(value: number | string) {
  const amount = typeof value === "string" ? Number.parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}
