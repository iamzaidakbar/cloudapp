import { env } from "@/lib/env";

export function isAwsConfigured() {
  return Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);
}

// AWS Cost Explorer's GetCostAndUsage costs a small real fee per API call and
// needs up to 24h to populate on a fresh account, so it's opt-in only — never
// called just because AWS credentials happen to be configured.
export function isCostExplorerEnabled() {
  return env.AWS_COST_EXPLORER_ENABLED === "true";
}
