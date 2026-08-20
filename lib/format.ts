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
