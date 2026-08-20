import { CloudWatchClient, GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import type { AssumedRoleCredentials } from "@/lib/aws/sts";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const ONE_HOUR_SECONDS = 3600;

export type CpuUtilization = { avgPercent: number | null; datapointCount: number };

// Fetches average hourly CPU utilization over the last 14 days for a batch
// of EC2 instances in one call. Returns an empty map on any failure (missing
// cloudwatch:GetMetricData permission, throttling, etc.) — callers treat a
// missing entry as "utilization data unavailable" and skip utilization-based
// findings for that instance rather than failing the whole audit.
export async function getEc2CpuUtilization(
  credentials: AssumedRoleCredentials,
  region: string,
  instanceIds: string[],
): Promise<Map<string, CpuUtilization>> {
  const result = new Map<string, CpuUtilization>();
  if (instanceIds.length === 0) return result;

  const client = new CloudWatchClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - FOURTEEN_DAYS_MS);

  try {
    // GetMetricData allows up to 500 queries per call; this project's
    // simplified v1 scope assumes fewer than 500 EC2 instances per audit.
    const queries = instanceIds.slice(0, 500).map((instanceId, index) => ({
      Id: `cpu${index}`,
      MetricStat: {
        Metric: {
          Namespace: "AWS/EC2",
          MetricName: "CPUUtilization",
          Dimensions: [{ Name: "InstanceId", Value: instanceId }],
        },
        Period: ONE_HOUR_SECONDS,
        Stat: "Average",
      },
      ReturnData: true,
    }));

    const response = await client.send(
      new GetMetricDataCommand({
        StartTime: startTime,
        EndTime: endTime,
        MetricDataQueries: queries,
      }),
    );

    (response.MetricDataResults ?? []).forEach((metricResult, index) => {
      const instanceId = instanceIds[index];
      const values = metricResult.Values ?? [];
      if (values.length === 0) {
        result.set(instanceId, { avgPercent: null, datapointCount: 0 });
        return;
      }
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      result.set(instanceId, { avgPercent: avg, datapointCount: values.length });
    });
  } catch (error) {
    console.error("CloudWatch GetMetricData failed:", error);
  }

  return result;
}
