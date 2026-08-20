import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeVolumesCommand,
  DescribeSecurityGroupsCommand,
  DescribeVpcsCommand,
} from "@aws-sdk/client-ec2";
import {
  S3Client,
  ListBucketsCommand,
  GetBucketLocationCommand,
  GetBucketTaggingCommand,
  GetPublicAccessBlockCommand,
  GetBucketPolicyStatusCommand,
  GetBucketAclCommand,
} from "@aws-sdk/client-s3";
import { RDSClient, DescribeDBInstancesCommand, ListTagsForResourceCommand as RdsListTagsCommand } from "@aws-sdk/client-rds";
import { LambdaClient, ListFunctionsCommand, ListTagsCommand as LambdaListTagsCommand } from "@aws-sdk/client-lambda";
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
  DescribeTagsCommand as ElbDescribeTagsCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import { IAMClient, ListRolesCommand } from "@aws-sdk/client-iam";
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import type { AssumedRoleCredentials } from "@/lib/aws/sts";
import { getEc2CpuUtilization } from "@/lib/aws/audit/cloudwatch";
import type { CollectedResource } from "@/lib/aws/audit/types";

const ALL_USERS_GROUP_URI = "http://acs.amazonaws.com/groups/global/AllUsers";

function tagsArrayToRecord(tags: Array<{ Key?: string; Value?: string }> | undefined): Record<string, string> {
  const record: Record<string, string> = {};
  for (const tag of tags ?? []) {
    if (tag.Key) record[tag.Key] = tag.Value ?? "";
  }
  return record;
}

function credentialsFor(credentials: AssumedRoleCredentials) {
  return {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  };
}

export async function collectEc2Instances(
  credentials: AssumedRoleCredentials,
  region: string,
): Promise<CollectedResource[]> {
  const client = new EC2Client({ region, credentials: credentialsFor(credentials) });
  const resources: CollectedResource[] = [];
  const instanceIds: string[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.send(new DescribeInstancesCommand({ NextToken: nextToken }));
    for (const reservation of response.Reservations ?? []) {
      for (const instance of reservation.Instances ?? []) {
        if (!instance.InstanceId) continue;
        instanceIds.push(instance.InstanceId);
        resources.push({
          service: "EC2_INSTANCE",
          resourceId: instance.InstanceId,
          name: tagsArrayToRecord(instance.Tags).Name ?? null,
          region,
          status: instance.State?.Name ?? null,
          tags: tagsArrayToRecord(instance.Tags),
          rawConfig: instance,
          monthlyCost: null,
          costAvailable: false,
          cpuUtilizationAvgPercent: null,
          cpuUtilizationDatapointCount: 0,
          instanceType: instance.InstanceType,
        });
      }
    }
    nextToken = response.NextToken;
  } while (nextToken);

  const runningIds = resources.filter((r) => r.status === "running").map((r) => r.resourceId);
  const utilization = await getEc2CpuUtilization(credentials, region, runningIds);
  for (const resource of resources) {
    const stats = utilization.get(resource.resourceId);
    if (stats) {
      resource.cpuUtilizationAvgPercent = stats.avgPercent;
      resource.cpuUtilizationDatapointCount = stats.datapointCount;
    }
  }

  return resources;
}

export async function collectEbsVolumes(
  credentials: AssumedRoleCredentials,
  region: string,
): Promise<CollectedResource[]> {
  const client = new EC2Client({ region, credentials: credentialsFor(credentials) });
  const resources: CollectedResource[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.send(new DescribeVolumesCommand({ NextToken: nextToken }));
    for (const volume of response.Volumes ?? []) {
      if (!volume.VolumeId) continue;
      resources.push({
        service: "EBS_VOLUME",
        resourceId: volume.VolumeId,
        name: tagsArrayToRecord(volume.Tags).Name ?? null,
        region,
        status: volume.State ?? null,
        tags: tagsArrayToRecord(volume.Tags),
        rawConfig: volume,
        monthlyCost: null,
        costAvailable: false,
        cpuUtilizationAvgPercent: null,
        cpuUtilizationDatapointCount: 0,
        encrypted: volume.Encrypted,
      });
    }
    nextToken = response.NextToken;
  } while (nextToken);

  return resources;
}

export async function collectSecurityGroups(
  credentials: AssumedRoleCredentials,
  region: string,
): Promise<CollectedResource[]> {
  const client = new EC2Client({ region, credentials: credentialsFor(credentials) });
  const resources: CollectedResource[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.send(new DescribeSecurityGroupsCommand({ NextToken: nextToken }));
    for (const group of response.SecurityGroups ?? []) {
      if (!group.GroupId) continue;
      resources.push({
        service: "SECURITY_GROUP",
        resourceId: group.GroupId,
        name: group.GroupName ?? null,
        region,
        status: null,
        tags: tagsArrayToRecord(group.Tags),
        rawConfig: group,
        monthlyCost: null,
        costAvailable: false,
        cpuUtilizationAvgPercent: null,
        cpuUtilizationDatapointCount: 0,
      });
    }
    nextToken = response.NextToken;
  } while (nextToken);

  return resources;
}

export async function collectVpcs(
  credentials: AssumedRoleCredentials,
  region: string,
): Promise<CollectedResource[]> {
  const client = new EC2Client({ region, credentials: credentialsFor(credentials) });
  const resources: CollectedResource[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.send(new DescribeVpcsCommand({ NextToken: nextToken }));
    for (const vpc of response.Vpcs ?? []) {
      if (!vpc.VpcId) continue;
      resources.push({
        service: "VPC",
        resourceId: vpc.VpcId,
        name: tagsArrayToRecord(vpc.Tags).Name ?? null,
        region,
        status: vpc.State ?? null,
        tags: tagsArrayToRecord(vpc.Tags),
        rawConfig: vpc,
        monthlyCost: null,
        costAvailable: false,
        cpuUtilizationAvgPercent: null,
        cpuUtilizationDatapointCount: 0,
      });
    }
    nextToken = response.NextToken;
  } while (nextToken);

  return resources;
}

async function determineBucketIsPublic(client: S3Client, bucket: string): Promise<boolean | undefined> {
  try {
    const block = await client.send(new GetPublicAccessBlockCommand({ Bucket: bucket }));
    const config = block.PublicAccessBlockConfiguration;
    if (config?.BlockPublicAcls && config.BlockPublicPolicy && config.IgnorePublicAcls && config.RestrictPublicBuckets) {
      return false;
    }
  } catch {
    // No public access block configured, or missing permission — fall through to policy/ACL checks.
  }

  try {
    const policyStatus = await client.send(new GetBucketPolicyStatusCommand({ Bucket: bucket }));
    if (policyStatus.PolicyStatus?.IsPublic === true) return true;
  } catch {
    // No bucket policy, or missing permission — fall through to ACL check.
  }

  try {
    const acl = await client.send(new GetBucketAclCommand({ Bucket: bucket }));
    const hasPublicGrant = (acl.Grants ?? []).some(
      (grant) => grant.Grantee?.URI === ALL_USERS_GROUP_URI,
    );
    if (hasPublicGrant) return true;
  } catch {
    return undefined;
  }

  return false;
}

export async function collectS3Buckets(credentials: AssumedRoleCredentials): Promise<CollectedResource[]> {
  // S3 bucket listing is global; each bucket's client is region-scoped once
  // its actual region is known so per-bucket calls hit the right endpoint.
  const globalClient = new S3Client({ region: "us-east-1", credentials: credentialsFor(credentials) });
  const response = await globalClient.send(new ListBucketsCommand({}));
  const resources: CollectedResource[] = [];

  for (const bucket of response.Buckets ?? []) {
    if (!bucket.Name) continue;

    let region = "us-east-1";
    try {
      const location = await globalClient.send(new GetBucketLocationCommand({ Bucket: bucket.Name }));
      region = location.LocationConstraint || "us-east-1";
    } catch {
      // keep default
    }

    const client = new S3Client({ region, credentials: credentialsFor(credentials) });

    let tags: Record<string, string> = {};
    try {
      const tagging = await client.send(new GetBucketTaggingCommand({ Bucket: bucket.Name }));
      tags = tagsArrayToRecord(tagging.TagSet);
    } catch {
      // no tags configured
    }

    const isPublic = await determineBucketIsPublic(client, bucket.Name);

    resources.push({
      service: "S3_BUCKET",
      resourceId: bucket.Name,
      name: bucket.Name,
      region,
      status: null,
      tags,
      rawConfig: { name: bucket.Name, creationDate: bucket.CreationDate, region },
      monthlyCost: null,
      costAvailable: false,
      cpuUtilizationAvgPercent: null,
      cpuUtilizationDatapointCount: 0,
      isPublic,
    });
  }

  return resources;
}

export async function collectRdsInstances(
  credentials: AssumedRoleCredentials,
  region: string,
): Promise<CollectedResource[]> {
  const client = new RDSClient({ region, credentials: credentialsFor(credentials) });
  const resources: CollectedResource[] = [];
  let marker: string | undefined;

  do {
    const response = await client.send(new DescribeDBInstancesCommand({ Marker: marker }));
    for (const instance of response.DBInstances ?? []) {
      if (!instance.DBInstanceIdentifier) continue;

      let tags: Record<string, string> = {};
      if (instance.DBInstanceArn) {
        try {
          const tagResponse = await client.send(
            new RdsListTagsCommand({ ResourceName: instance.DBInstanceArn }),
          );
          tags = tagsArrayToRecord(tagResponse.TagList);
        } catch {
          // missing permission — leave empty
        }
      }

      resources.push({
        service: "RDS_INSTANCE",
        resourceId: instance.DBInstanceIdentifier,
        name: instance.DBInstanceIdentifier,
        region,
        status: instance.DBInstanceStatus ?? null,
        tags,
        rawConfig: instance,
        monthlyCost: null,
        costAvailable: false,
        cpuUtilizationAvgPercent: null,
        cpuUtilizationDatapointCount: 0,
      });
    }
    marker = response.Marker;
  } while (marker);

  return resources;
}

export async function collectLambdaFunctions(
  credentials: AssumedRoleCredentials,
  region: string,
): Promise<CollectedResource[]> {
  const client = new LambdaClient({ region, credentials: credentialsFor(credentials) });
  const resources: CollectedResource[] = [];
  let marker: string | undefined;

  do {
    const response = await client.send(new ListFunctionsCommand({ Marker: marker }));
    for (const fn of response.Functions ?? []) {
      if (!fn.FunctionName) continue;

      let tags: Record<string, string> = {};
      if (fn.FunctionArn) {
        try {
          const tagResponse = await client.send(new LambdaListTagsCommand({ Resource: fn.FunctionArn }));
          tags = tagResponse.Tags ?? {};
        } catch {
          // missing permission — leave empty
        }
      }

      resources.push({
        service: "LAMBDA_FUNCTION",
        resourceId: fn.FunctionName,
        name: fn.FunctionName,
        region,
        status: fn.State ?? null,
        tags,
        rawConfig: fn,
        monthlyCost: null,
        costAvailable: false,
        cpuUtilizationAvgPercent: null,
        cpuUtilizationDatapointCount: 0,
      });
    }
    marker = response.NextMarker;
  } while (marker);

  return resources;
}

export async function collectLoadBalancers(
  credentials: AssumedRoleCredentials,
  region: string,
): Promise<CollectedResource[]> {
  const client = new ElasticLoadBalancingV2Client({ region, credentials: credentialsFor(credentials) });
  const resources: CollectedResource[] = [];
  let marker: string | undefined;

  do {
    const response = await client.send(new DescribeLoadBalancersCommand({ Marker: marker }));
    const balancers = response.LoadBalancers ?? [];
    const arns = balancers.map((lb) => lb.LoadBalancerArn).filter((arn): arn is string => Boolean(arn));

    const tagsByArn = new Map<string, Record<string, string>>();
    if (arns.length > 0) {
      try {
        // DescribeTags accepts up to 20 ARNs per call.
        for (let i = 0; i < arns.length; i += 20) {
          const batch = arns.slice(i, i + 20);
          const tagResponse = await client.send(new ElbDescribeTagsCommand({ ResourceArns: batch }));
          for (const description of tagResponse.TagDescriptions ?? []) {
            if (description.ResourceArn) {
              tagsByArn.set(description.ResourceArn, tagsArrayToRecord(description.Tags));
            }
          }
        }
      } catch {
        // missing permission — leave empty
      }
    }

    for (const lb of balancers) {
      if (!lb.LoadBalancerArn) continue;
      resources.push({
        service: "ELB_LOAD_BALANCER",
        resourceId: lb.LoadBalancerArn,
        name: lb.LoadBalancerName ?? null,
        region,
        status: lb.State?.Code ?? null,
        tags: tagsByArn.get(lb.LoadBalancerArn) ?? {},
        rawConfig: lb,
        monthlyCost: null,
        costAvailable: false,
        cpuUtilizationAvgPercent: null,
        cpuUtilizationDatapointCount: 0,
      });
    }
    marker = response.NextMarker;
  } while (marker);

  return resources;
}

export async function collectIamRoles(credentials: AssumedRoleCredentials): Promise<CollectedResource[]> {
  const client = new IAMClient({ region: "us-east-1", credentials: credentialsFor(credentials) });
  const resources: CollectedResource[] = [];
  let marker: string | undefined;

  do {
    const response = await client.send(new ListRolesCommand({ Marker: marker }));
    for (const role of response.Roles ?? []) {
      if (!role.RoleName) continue;
      resources.push({
        service: "IAM_ROLE",
        resourceId: role.Arn ?? role.RoleName,
        name: role.RoleName,
        region: "global",
        status: null,
        tags: tagsArrayToRecord(role.Tags),
        rawConfig: role,
        monthlyCost: null,
        costAvailable: false,
        cpuUtilizationAvgPercent: null,
        cpuUtilizationDatapointCount: 0,
      });
    }
    marker = response.Marker;
  } while (marker);

  return resources;
}

export async function collectCloudWatchLogGroups(
  credentials: AssumedRoleCredentials,
  region: string,
): Promise<CollectedResource[]> {
  const client = new CloudWatchLogsClient({ region, credentials: credentialsFor(credentials) });
  const resources: CollectedResource[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.send(new DescribeLogGroupsCommand({ nextToken }));
    for (const group of response.logGroups ?? []) {
      if (!group.logGroupName) continue;
      resources.push({
        service: "CLOUDWATCH_LOG_GROUP",
        resourceId: group.logGroupName,
        name: group.logGroupName,
        region,
        status: null,
        tags: {},
        rawConfig: group,
        monthlyCost: null,
        costAvailable: false,
        cpuUtilizationAvgPercent: null,
        cpuUtilizationDatapointCount: 0,
      });
    }
    nextToken = response.nextToken;
  } while (nextToken);

  return resources;
}
