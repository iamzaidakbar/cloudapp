import { PricingClient, GetProductsCommand } from "@aws-sdk/client-pricing";
import { getCached, setCached, ONE_DAY_MS } from "@/lib/pricing/cache";
import { toAwsLocationName } from "@/lib/pricing/reference-data";

const HOURS_PER_MONTH = 730;

// The Price List Query API has exactly one usable endpoint region regardless
// of the priced resource's own region — confirmed against AWS's current
// docs. Uses CloudShift-G's own AWS identity (default credential provider
// chain reads AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY from env, same as
// lib/aws/sts.ts's getAppAwsIdentity) — this is public price list data, not
// tenant-scoped, so no cross-account AssumeRole is needed here.
function pricingClient() {
  return new PricingClient({ region: "us-east-1" });
}

type PriceListEntry = {
  terms?: { OnDemand?: Record<string, { priceDimensions?: Record<string, { pricePerUnit?: { USD?: string } }> }> };
};

// Walks terms.OnDemand -> first rate code -> first price dimension ->
// pricePerUnit.USD, which is the shape returned for every simple (non-tiered)
// on-demand product this app prices (single instance/storage rate, no
// volume tiers) — confirmed against AWS's own GetProducts example response.
function extractOnDemandUsd(priceListJson: string): number | null {
  const entry = JSON.parse(priceListJson) as PriceListEntry;
  const onDemand = entry.terms?.OnDemand;
  if (!onDemand) return null;

  const rateCode = Object.values(onDemand)[0];
  const priceDimension = rateCode?.priceDimensions ? Object.values(rateCode.priceDimensions)[0] : undefined;
  const usd = priceDimension?.pricePerUnit?.USD;
  if (!usd) return null;

  const value = Number.parseFloat(usd);
  return Number.isFinite(value) ? value : null;
}

async function fetchFirstOnDemandPrice(
  cacheKey: string,
  serviceCode: string,
  filters: Array<{ Field: string; Value: string }>,
): Promise<number | null> {
  const cached = await getCached<number>("AWS", cacheKey);
  if (cached !== null) return cached;

  try {
    const response = await pricingClient().send(
      new GetProductsCommand({
        ServiceCode: serviceCode,
        Filters: filters.map((f) => ({ Type: "TERM_MATCH" as const, Field: f.Field, Value: f.Value })),
        MaxResults: 1,
      }),
    );

    const [priceListJson] = response.PriceList ?? [];
    if (!priceListJson) return null;

    const price = extractOnDemandUsd(priceListJson);
    if (price === null) return null;

    await setCached("AWS", cacheKey, price, ONE_DAY_MS);
    return price;
  } catch (error) {
    console.error(`AWS Price List lookup failed for ${cacheKey}:`, error);
    return null;
  }
}

export async function getEc2MonthlyPrice(instanceType: string, region: string): Promise<number | null> {
  const hourly = await fetchFirstOnDemandPrice(`ec2:${instanceType}:${region}`, "AmazonEC2", [
    { Field: "instanceType", Value: instanceType },
    { Field: "location", Value: toAwsLocationName(region) },
    { Field: "operatingSystem", Value: "Linux" },
    { Field: "tenancy", Value: "Shared" },
    { Field: "preInstalledSw", Value: "NA" },
    { Field: "capacitystatus", Value: "Used" },
  ]);
  return hourly === null ? null : Math.round(hourly * HOURS_PER_MONTH * 100) / 100;
}

// AWS "Engine" values (from DescribeDBInstances) -> the RDS Price List's
// "databaseEngine" filter values. Engines outside this map (e.g. Oracle,
// SQL Server variants) are skipped rather than guessed at, since their
// licenseModel filter values vary and a wrong filter would silently return
// an unrelated product's price.
const RDS_ENGINE_FILTER: Record<string, string> = {
  mysql: "MySQL",
  postgres: "PostgreSQL",
  mariadb: "MariaDB",
};

export async function getRdsMonthlyPrice(
  instanceClass: string,
  engine: string,
  region: string,
): Promise<number | null> {
  const databaseEngine = RDS_ENGINE_FILTER[engine];
  if (!databaseEngine) return null;

  const hourly = await fetchFirstOnDemandPrice(`rds:${instanceClass}:${engine}:${region}`, "AmazonRDS", [
    { Field: "instanceType", Value: instanceClass },
    { Field: "location", Value: toAwsLocationName(region) },
    { Field: "databaseEngine", Value: databaseEngine },
    { Field: "deploymentOption", Value: "Single-AZ" },
    { Field: "licenseModel", Value: "No license required" },
  ]);
  return hourly === null ? null : Math.round(hourly * HOURS_PER_MONTH * 100) / 100;
}

export async function getS3MonthlyPricePerGb(region: string): Promise<number | null> {
  return fetchFirstOnDemandPrice(`s3:standard:${region}`, "AmazonS3", [
    { Field: "location", Value: toAwsLocationName(region) },
    { Field: "volumeType", Value: "Standard" },
    { Field: "storageClass", Value: "General Purpose" },
  ]);
}

export async function getDataTransferOutPricePerGb(region: string): Promise<number | null> {
  return fetchFirstOnDemandPrice(`datatransfer:out:${region}`, "AWSDataTransfer", [
    { Field: "fromLocation", Value: toAwsLocationName(region) },
    { Field: "transferType", Value: "AWS Outbound" },
  ]);
}
