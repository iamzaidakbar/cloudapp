import { env } from "@/lib/env";
import { getCached, setCached, ONE_DAY_MS, SEVEN_DAYS_MS } from "@/lib/pricing/cache";
import { toGcpRegion } from "@/lib/pricing/reference-data";

const BASE_URL = "https://cloudbilling.googleapis.com/v1";
const MONTHLY_HOURS = 730;

// Confirmed live against Google's current catalog (two independent sources
// per ID) — used only as a fallback if the dynamic services.list lookup
// below ever fails; never the primary source of truth.
const KNOWN_SERVICE_IDS: Record<string, string> = {
  "Compute Engine": "6F81-5844-456A",
  "Cloud Storage": "95FF-2EF5-5EA1",
  "Cloud SQL": "9662-B51E-5089",
};

type GcpService = { serviceId: string; displayName: string };
type GcpSku = {
  description: string;
  serviceRegions: string[];
  resourceFamily?: string;
  resourceGroup?: string;
  usageType?: string;
  usageUnit?: string;
  unitPrice: number; // pre-computed at fetch time, in USD per usageUnit
};

function priceFromRate(rate: { units?: string; nanos?: number } | undefined): number | null {
  if (!rate) return null;
  return Number.parseInt(rate.units ?? "0", 10) + (rate.nanos ?? 0) / 1e9;
}

async function resolveServiceId(displayName: string): Promise<string | null> {
  const cached = await getCached<Record<string, string>>("GCP", "service-ids");
  if (cached?.[displayName]) return cached[displayName];

  try {
    const services: GcpService[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL(`${BASE_URL}/services`);
      url.searchParams.set("key", env.GCP_BILLING_API_KEY!);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`services.list failed: ${response.status}`);
      const json = await response.json();
      for (const s of json.services ?? []) {
        services.push({ serviceId: s.serviceId, displayName: s.displayName });
      }
      pageToken = json.nextPageToken;
    } while (pageToken);

    const byName = Object.fromEntries(services.map((s) => [s.displayName, s.serviceId]));
    await setCached("GCP", "service-ids", byName, SEVEN_DAYS_MS);
    return byName[displayName] ?? KNOWN_SERVICE_IDS[displayName] ?? null;
  } catch (error) {
    console.error("GCP services.list failed, falling back to known service ID:", error);
    return KNOWN_SERVICE_IDS[displayName] ?? null;
  }
}

// Fetches every SKU for a service ONCE (paginated), trims each to the fields
// this app needs, and caches the trimmed set — reused across every
// resource in a comparison run rather than re-querying per resource.
async function fetchServiceSkus(serviceId: string): Promise<GcpSku[]> {
  const cacheKey = `skus:${serviceId}`;
  const cached = await getCached<GcpSku[]>("GCP", cacheKey);
  if (cached) return cached;

  const skus: GcpSku[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${BASE_URL}/services/${serviceId}/skus`);
    url.searchParams.set("key", env.GCP_BILLING_API_KEY!);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`skus.list failed: ${response.status}`);
    const json = await response.json();

    for (const sku of json.skus ?? []) {
      const rate = sku.pricingInfo?.[0]?.pricingExpression?.tieredRates?.[0]?.unitPrice;
      const price = priceFromRate(rate);
      if (price === null) continue;
      skus.push({
        description: sku.description ?? "",
        serviceRegions: sku.serviceRegions ?? [],
        resourceFamily: sku.category?.resourceFamily,
        resourceGroup: sku.category?.resourceGroup,
        usageType: sku.category?.usageType,
        usageUnit: sku.pricingInfo?.[0]?.pricingExpression?.usageUnit,
        unitPrice: price,
      });
    }
    pageToken = json.nextPageToken;
  } while (pageToken);

  await setCached("GCP", cacheKey, skus, ONE_DAY_MS);
  return skus;
}

function findSku(skus: GcpSku[], region: string, matcher: (sku: GcpSku) => boolean): GcpSku | undefined {
  return skus.find((sku) => sku.usageType === "OnDemand" && sku.serviceRegions.includes(region) && matcher(sku));
}

// Compute Engine (and Cloud SQL, below) decompose price into separate
// per-vCPU and per-GiB-RAM SKUs rather than one SKU per machine type —
// confirmed against Google's current Billing Catalog API docs.
export async function getComputeEngineMonthlyPrice(
  vcpu: number,
  ramGb: number,
  awsRegion: string,
  family: "E2" | "N2",
): Promise<number | null> {
  const serviceId = await resolveServiceId("Compute Engine");
  if (!serviceId) return null;

  try {
    const skus = await fetchServiceSkus(serviceId);
    const region = toGcpRegion(awsRegion);
    const corePattern = new RegExp(`^${family} Instance Core`, "i");
    const ramPattern = new RegExp(`^${family} Instance Ram`, "i");

    const coreSku = findSku(skus, region, (s) => s.resourceFamily === "Compute" && corePattern.test(s.description));
    const ramSku = findSku(skus, region, (s) => s.resourceFamily === "Compute" && ramPattern.test(s.description));
    if (!coreSku || !ramSku) return null;

    const monthly = (coreSku.unitPrice * vcpu + ramSku.unitPrice * ramGb) * MONTHLY_HOURS;
    return Math.round(monthly * 100) / 100;
  } catch (error) {
    console.error("GCP Compute Engine pricing lookup failed:", error);
    return null;
  }
}

// Verified against live SKU data: Cloud SQL's catalog mixes several
// overlapping shapes per engine/region — bundled fixed-size SKUs ("8 vCPU +
// 52GB RAM"), "Regional" (HA, ~2x cost) variants, "Extended support"
// (legacy DB version surcharge) variants, and "Enterprise Plus" (a pricier
// edition) alongside the standard "Enterprise" edition. Matching loosely on
// "vcpu"/"ram" substrings picks up whichever of these happens to sort
// first, which is why an early version of this function returned a MySQL
// price ~2x its PostgreSQL equivalent for the same shape — not real
// pricing variance, a wrong-SKU bug. This now requires the precise
// "Zonal - Enterprise <generation> vCPU/RAM" shape (`\S+` between
// "Enterprise" and "vCPU"/"RAM" excludes "Enterprise Plus" and "Extended
// support", both of which have more than one word in that position), the
// standard non-HA tier this app compares against (matching AWS RDS's
// Single-AZ filter on the other side). Real SKU text also uses "Postgres",
// not "PostgreSQL" — matched via the shared substring rather than the full
// product name.
export async function getCloudSqlMonthlyPrice(
  vcpu: number,
  ramGb: number,
  awsRegion: string,
  engine: "MySQL" | "PostgreSQL",
): Promise<number | null> {
  const serviceId = await resolveServiceId("Cloud SQL");
  if (!serviceId) return null;

  try {
    const skus = await fetchServiceSkus(serviceId);
    const region = toGcpRegion(awsRegion);
    const engineLabel = engine === "PostgreSQL" ? "postgres" : "mysql";
    const enginePattern = new RegExp(engineLabel, "i");
    // Google's own SKU text is inconsistent between the two: the vCPU
    // variant has "Zonal - Enterprise" (space before the hyphen) while the
    // RAM variant has "Zonal- Enterprise" (no space) — confirmed against
    // live data. \s* around the hyphen tolerates both.
    const corePattern = new RegExp(`${engineLabel}:\\s*Zonal\\s*-\\s*Enterprise \\S+ vCPU`, "i");
    const ramPattern = new RegExp(`${engineLabel}:\\s*Zonal\\s*-\\s*Enterprise \\S+ RAM`, "i");

    const coreSku = findSku(skus, region, (s) => enginePattern.test(s.description) && corePattern.test(s.description));
    const ramSku = findSku(skus, region, (s) => enginePattern.test(s.description) && ramPattern.test(s.description));
    if (!coreSku || !ramSku) return null;

    const monthly = (coreSku.unitPrice * vcpu + ramSku.unitPrice * ramGb) * MONTHLY_HOURS;
    return Math.round(monthly * 100) / 100;
  } catch (error) {
    console.error("GCP Cloud SQL pricing lookup failed:", error);
    return null;
  }
}

export async function getCloudStorageMonthlyPricePerGb(awsRegion: string): Promise<number | null> {
  const serviceId = await resolveServiceId("Cloud Storage");
  if (!serviceId) return null;

  try {
    const skus = await fetchServiceSkus(serviceId);
    const region = toGcpRegion(awsRegion);
    const sku = findSku(
      skus,
      region,
      (s) => s.resourceFamily === "Storage" && /standard storage/i.test(s.description),
    );
    return sku ? Math.round(sku.unitPrice * 100) / 100 : null;
  } catch (error) {
    console.error("GCP Cloud Storage pricing lookup failed:", error);
    return null;
  }
}
