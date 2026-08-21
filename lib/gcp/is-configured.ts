import { env } from "@/lib/env";

// The Cloud Billing Catalog API is global public list pricing and only needs
// a plain API key (no OAuth/service account) — see lib/pricing/gcp-billing-catalog.ts.
export function isGcpBillingConfigured() {
  const key = env.GCP_BILLING_API_KEY?.trim();
  return Boolean(key && key !== "unset");
}
