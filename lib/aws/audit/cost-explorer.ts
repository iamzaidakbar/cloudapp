import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";
import type { AssumedRoleCredentials } from "@/lib/aws/sts";

// Cost Explorer is account-wide and does not reliably attribute cost to
// individual resources without Cost & Usage Reports at resource-level
// granularity (a separate, more involved setup). This returns one
// account-wide total for the trailing 30 days rather than claiming precise
// per-resource costs the API can't actually provide simply. Cost Explorer's
// endpoint is always us-east-1 regardless of the audited account's region.
export async function getAccountMonthlyCost(
  credentials: AssumedRoleCredentials,
): Promise<number | null> {
  const client = new CostExplorerClient({
    region: "us-east-1",
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const format = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const response = await client.send(
      new GetCostAndUsageCommand({
        TimePeriod: { Start: format(start), End: format(end) },
        Granularity: "MONTHLY",
        Metrics: ["UnblendedCost"],
      }),
    );

    const total = (response.ResultsByTime ?? []).reduce((sum, period) => {
      const amount = Number.parseFloat(period.Total?.UnblendedCost?.Amount ?? "0");
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    return total;
  } catch (error) {
    console.error("Cost Explorer GetCostAndUsage failed:", error);
    return null;
  }
}
