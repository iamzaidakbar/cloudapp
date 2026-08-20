import { CloudWatchClient, GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import type { AssumedRoleCredentials } from "@/lib/aws/sts";

// S3 storage metrics are daily, not hourly (AWS/S3's BucketSizeBytes is only
// published once/day), so this looks back 2 days and takes the most recent
// datapoint rather than averaging. Returns null on any failure (missing
// permission, no datapoints yet for a brand-new bucket) — callers treat that
// as "size not available" and skip the cost/migration-cost figures that
// depend on it, same degrade-gracefully pattern as CloudWatch EC2 utilization.
export async function getS3BucketSizeGb(
  credentials: AssumedRoleCredentials,
  region: string,
  bucketName: string,
): Promise<number | null> {
  const client = new CloudWatchClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 2 * 24 * 60 * 60 * 1000);

  try {
    const response = await client.send(
      new GetMetricDataCommand({
        StartTime: startTime,
        EndTime: endTime,
        MetricDataQueries: [
          {
            Id: "size",
            MetricStat: {
              Metric: {
                Namespace: "AWS/S3",
                MetricName: "BucketSizeBytes",
                Dimensions: [
                  { Name: "BucketName", Value: bucketName },
                  { Name: "StorageType", Value: "StandardStorage" },
                ],
              },
              Period: 86400,
              Stat: "Average",
            },
            ReturnData: true,
          },
        ],
      }),
    );

    const values = response.MetricDataResults?.[0]?.Values ?? [];
    if (values.length === 0) return null;

    const mostRecentBytes = values[0];
    return mostRecentBytes / 1024 ** 3;
  } catch (error) {
    console.error(`CloudWatch S3 BucketSizeBytes lookup failed for ${bucketName}:`, error);
    return null;
  }
}
