import { getAccessToken } from "@/lib/gcp/auth";
import type { AwsServiceType } from "@/lib/generated/prisma/client";

export type VerificationOutcome = { status: "HEALTHY" | "UNHEALTHY" | "UNAVAILABLE"; detail: string | null; checkedRef: string | null };

// google_cloudfunctions2_function is the one resource type this app
// provisions whose Terraform state has no self_link (confirmed against the
// real provider docs — it exports only `id`, a bare resource path like
// "projects/{p}/locations/{l}/functions/{n}", not a URL). Every other
// resource type's self_link is already a fetchable https:// URI, confirmed
// the same way. This is the one place a bare id needs a base URL prefixed.
function resolveUrl(ref: string): string {
  if (ref.startsWith("https://")) return ref;
  return `https://cloudfunctions.googleapis.com/v2/${ref}`;
}

async function fetchResourceState(ref: string): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; detail: string }> {
  const url = resolveUrl(ref);
  const token = await getAccessToken();

  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "Network error contacting GCP." };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return { ok: false, detail: `${response.status} ${response.statusText}${text ? ` — ${text.slice(0, 300)}` : ""}` };
  }

  const body = (await response.json()) as Record<string, unknown>;
  return { ok: true, body };
}

async function verifyByStateField(ref: string, field: "status" | "state", healthyValue: string): Promise<VerificationOutcome> {
  const url = resolveUrl(ref);
  const result = await fetchResourceState(ref);
  if (!result.ok) return { status: "UNHEALTHY", detail: result.detail, checkedRef: url };

  const value = result.body[field];
  const healthy = value === healthyValue;
  return {
    status: healthy ? "HEALTHY" : "UNHEALTHY",
    detail: typeof value === "string" ? value : `Missing "${field}" in response`,
    checkedRef: url,
  };
}

async function verifyExistence(ref: string): Promise<VerificationOutcome> {
  const url = resolveUrl(ref);
  const result = await fetchResourceState(ref);
  if (!result.ok) return { status: "UNHEALTHY", detail: result.detail, checkedRef: url };
  return { status: "HEALTHY", detail: "Reachable", checkedRef: url };
}

// Real, live health checks — never derived from the ApplyRun's past outcome.
// "Created successfully once" and "healthy right now" are different claims;
// this always re-queries GCP at call time.
export async function verifyResource(awsService: AwsServiceType, gcpResourceSelfLink: string | null): Promise<VerificationOutcome> {
  if (!gcpResourceSelfLink) {
    return { status: "UNAVAILABLE", detail: "Not yet provisioned.", checkedRef: null };
  }

  switch (awsService) {
    case "EC2_INSTANCE":
      return verifyByStateField(gcpResourceSelfLink, "status", "RUNNING");
    case "RDS_INSTANCE":
      return verifyByStateField(gcpResourceSelfLink, "state", "RUNNABLE");
    case "S3_BUCKET":
      return verifyExistence(gcpResourceSelfLink);
    case "LAMBDA_FUNCTION":
      return verifyByStateField(gcpResourceSelfLink, "state", "ACTIVE");
    default:
      return { status: "UNAVAILABLE", detail: "No verification check implemented for this resource type.", checkedRef: null };
  }
}
