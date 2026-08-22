import { Storage } from "@google-cloud/storage";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { withTenantContext } from "@/lib/db/with-tenant";
import { assumeTenantRole } from "@/lib/aws/sts";
import { isAwsConfigured } from "@/lib/aws/is-configured";
import { gcsBucketNameFromSelfLink } from "@/lib/transfer/gcs-bucket";
import {
  credentialForResource,
  loadRdsCredentialsFromEnv,
} from "@/lib/transfer/rds-credentials";
import { transferRdsInstance } from "@/lib/transfer/rds";
import { transferLambdaFunction } from "@/lib/transfer/lambda";
import { transferEc2Instance } from "@/lib/transfer/ec2";
import { deleteRdsCredentialsSecret } from "@/lib/transfer/rds-credentials-secret";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  type _Object,
} from "@aws-sdk/client-s3";

const TRANSFER_SERVICES = new Set([
  "S3_BUCKET",
  "RDS_INSTANCE",
  "LAMBDA_FUNCTION",
  "EC2_INSTANCE",
]);

type SkippedResource = {
  migrationResourceId: string;
  awsService: string;
  awsResourceId: string;
  reason: string;
};

function credentialsFor(creds: {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}) {
  return {
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    sessionToken: creds.sessionToken,
  };
}

async function listAllS3Objects(
  client: S3Client,
  bucket: string,
): Promise<_Object[]> {
  const objects: _Object[] = [];
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    );
    if (page.Contents) objects.push(...page.Contents);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

async function listGcsObjectStats(
  storage: Storage,
  bucketName: string,
): Promise<{ count: number; bytes: number }> {
  const [files] = await storage.bucket(bucketName).getFiles();
  let bytes = 0;
  for (const file of files) {
    const size = Number(file.metadata.size ?? 0);
    if (Number.isFinite(size)) bytes += size;
  }
  return { count: files.length, bytes };
}

export async function runTransfer(
  transferRunId: string,
  tenantId: string,
  options: { rdsCredentialsSecret?: string } = {},
): Promise<void> {
  const now = new Date();

  const transferRun = await withTenantContext(tenantId, (tx) =>
    tx.transferRun.findUniqueOrThrow({
      where: { id: transferRunId },
      select: { migrationPlanId: true },
    }),
  );

  await withTenantContext(tenantId, (tx) =>
    tx.transferRun.update({
      where: { id: transferRunId },
      data: { status: "RUNNING", startedAt: now },
    }),
  );

  const [connection, resources] = await withTenantContext(tenantId, (tx) =>
    Promise.all([
      tx.awsConnection.findUnique({ where: { tenantId } }),
      tx.migrationResource.findMany({
        where: { tenantId, migrationPlanId: transferRun.migrationPlanId },
      }),
    ]),
  );

  if (!isAwsConfigured()) {
    await failRun(transferRunId, tenantId, "AWS credentials are not configured on the app.");
    return;
  }
  if (!connection?.roleArn || connection.status !== "CONNECTED") {
    await failRun(transferRunId, tenantId, "AWS connection is not verified for this tenant.");
    return;
  }

  const projectId =
    process.env.GCP_PROJECT_ID?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim();
  if (!projectId) {
    await failRun(transferRunId, tenantId, "GCP_PROJECT_ID is not set.");
    return;
  }

  const rdsCredentials = loadRdsCredentialsFromEnv();
  const skipped: SkippedResource[] = [];
  const eligible = resources.filter((r) => {
    if (!TRANSFER_SERVICES.has(r.awsService)) {
      skipped.push({
        migrationResourceId: r.id,
        awsService: r.awsService,
        awsResourceId: r.awsResourceId,
        reason:
          "not supported for data transfer (S3, RDS, Lambda zip, EC2 AMI→GCE image only)",
      });
      return false;
    }
    if (!r.gcpResourceSelfLink) {
      skipped.push({
        migrationResourceId: r.id,
        awsService: r.awsService,
        awsResourceId: r.awsResourceId,
        reason: "not provisioned yet — run Apply first",
      });
      return false;
    }
    if (r.awsService === "RDS_INSTANCE" && !credentialForResource(rdsCredentials, r.id)) {
      skipped.push({
        migrationResourceId: r.id,
        awsService: r.awsService,
        awsResourceId: r.awsResourceId,
        reason: "missing RDS password for this resource",
      });
      return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    await withTenantContext(tenantId, (tx) =>
      tx.transferRun.update({
        where: { id: transferRunId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          errorMessage:
            "No provisioned transfer targets (S3 / RDS / Lambda / EC2). Check Apply and RDS passwords.",
          objectsCopied: 0,
          bytesCopied: BigInt(0),
          skippedResources: skipped,
        },
      }),
    );
    await cleanupSecret(options.rdsCredentialsSecret);
    return;
  }

  try {
    const creds = await assumeTenantRole(
      connection.roleArn,
      connection.externalId,
      `cloudshiftg-transfer-${transferRunId.slice(0, 12)}`,
      3600,
    );
    const storage = new Storage();
    const awsCreds = credentialsFor(creds);

    let totalObjects = 0;
    let totalBytes = 0;

    for (const resource of eligible) {
      if (resource.awsService === "S3_BUCKET") {
        const s3Bucket = resource.awsResourceName ?? resource.awsResourceId;
        const gcsBucket = gcsBucketNameFromSelfLink(resource.gcpResourceSelfLink!);
        if (!gcsBucket) {
          throw new Error(`Could not parse GCS bucket from ${resource.gcpResourceSelfLink}`);
        }

        const regionalS3 = new S3Client({
          region: resource.region || "us-east-1",
          credentials: awsCreds,
        });

        const objects = await listAllS3Objects(regionalS3, s3Bucket);

        let copiedObjects = 0;
        let copiedBytes = 0;

        for (const obj of objects) {
          const key = obj.Key;
          if (!key) continue;
          const size = obj.Size ?? 0;

          const get = await regionalS3.send(
            new GetObjectCommand({ Bucket: s3Bucket, Key: key }),
          );
          if (!get.Body) {
            throw new Error(`Empty body for s3://${s3Bucket}/${key}`);
          }

          const body = get.Body as Readable;
          const gcsFile = storage.bucket(gcsBucket).file(key);
          const writeStream = gcsFile.createWriteStream({
            resumable: size > 5 * 1024 * 1024,
            metadata: {
              contentType: get.ContentType,
              metadata: {
                "cloudshiftg-source": `s3://${s3Bucket}/${key}`,
              },
            },
          });

          await pipeline(body, writeStream);
          copiedObjects += 1;
          copiedBytes += size;
        }

        const gcsStats = await listGcsObjectStats(storage, gcsBucket);
        const s3Bytes = objects.reduce((sum, o) => sum + (o.Size ?? 0), 0);
        if (gcsStats.count !== objects.length || gcsStats.bytes !== s3Bytes) {
          throw new Error(
            `Post-copy verify failed for ${s3Bucket} → ${gcsBucket}: ` +
              `S3 ${objects.length} objects / ${s3Bytes} bytes vs ` +
              `GCS ${gcsStats.count} objects / ${gcsStats.bytes} bytes`,
          );
        }

        await withTenantContext(tenantId, (tx) =>
          tx.migrationResource.update({
            where: { id: resource.id },
            data: {
              transferredAt: new Date(),
              objectsTransferred: copiedObjects,
              bytesTransferred: BigInt(copiedBytes),
            },
          }),
        );

        totalObjects += copiedObjects;
        totalBytes += copiedBytes;
        continue;
      }

      if (resource.awsService === "RDS_INSTANCE") {
        const rdsCred = credentialForResource(rdsCredentials, resource.id);
        if (!rdsCred) {
          throw new Error(`Missing RDS credentials for ${resource.awsResourceId}`);
        }

        const result = await transferRdsInstance({
          awsCredentials: awsCreds,
          region: resource.region || "us-east-1",
          awsResourceId: resource.awsResourceId,
          gcpResourceSelfLink: resource.gcpResourceSelfLink,
          migrationPlanId: transferRun.migrationPlanId,
          migrationResourceId: resource.id,
          credential: rdsCred,
          projectId,
        });

        await withTenantContext(tenantId, (tx) =>
          tx.migrationResource.update({
            where: { id: resource.id },
            data: {
              transferredAt: new Date(),
              objectsTransferred: result.objectsTransferred,
              bytesTransferred: BigInt(result.bytesTransferred),
            },
          }),
        );

        totalObjects += result.objectsTransferred;
        totalBytes += result.bytesTransferred;
        continue;
      }

      if (resource.awsService === "LAMBDA_FUNCTION") {
        const result = await transferLambdaFunction({
          awsCredentials: awsCreds,
          region: resource.region || "us-east-1",
          awsResourceId: resource.awsResourceId,
          gcpResourceSelfLink: resource.gcpResourceSelfLink,
          migrationPlanId: transferRun.migrationPlanId,
          migrationResourceId: resource.id,
          projectId,
        });

        await withTenantContext(tenantId, (tx) =>
          tx.migrationResource.update({
            where: { id: resource.id },
            data: {
              transferredAt: new Date(),
              objectsTransferred: result.objectsTransferred,
              bytesTransferred: BigInt(result.bytesTransferred),
            },
          }),
        );

        totalObjects += result.objectsTransferred;
        totalBytes += result.bytesTransferred;
        continue;
      }

      if (resource.awsService === "EC2_INSTANCE") {
        const result = await transferEc2Instance({
          awsCredentials: awsCreds,
          region: resource.region || "us-east-1",
          awsResourceId: resource.awsResourceId,
          gcpResourceSelfLink: resource.gcpResourceSelfLink,
          migrationPlanId: transferRun.migrationPlanId,
          migrationResourceId: resource.id,
          projectId,
        });

        await withTenantContext(tenantId, (tx) =>
          tx.migrationResource.update({
            where: { id: resource.id },
            data: {
              transferredAt: new Date(),
              objectsTransferred: result.objectsTransferred,
              bytesTransferred: BigInt(result.bytesTransferred),
            },
          }),
        );

        totalObjects += result.objectsTransferred;
        totalBytes += result.bytesTransferred;
      }
    }

    await withTenantContext(tenantId, (tx) =>
      tx.transferRun.update({
        where: { id: transferRunId },
        data: {
          status: "SUCCEEDED",
          finishedAt: new Date(),
          errorMessage: null,
          objectsCopied: totalObjects,
          bytesCopied: BigInt(totalBytes),
          skippedResources: skipped.length ? skipped : undefined,
        },
      }),
    );
  } catch (error) {
    console.error(`Transfer run ${transferRunId} failed:`, error);
    const message = error instanceof Error ? error.message : "Data transfer failed unexpectedly.";
    await failRun(transferRunId, tenantId, message.slice(0, 500), skipped);
  } finally {
    await cleanupSecret(options.rdsCredentialsSecret);
  }
}

async function cleanupSecret(secretName: string | undefined) {
  if (!secretName) return;
  try {
    await deleteRdsCredentialsSecret(secretName);
  } catch (error) {
    console.warn(`Failed to delete transfer RDS secret ${secretName}:`, error);
  }
}

async function failRun(
  transferRunId: string,
  tenantId: string,
  errorMessage: string,
  skipped?: SkippedResource[],
) {
  await withTenantContext(tenantId, (tx) =>
    tx.transferRun.update({
      where: { id: transferRunId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage,
        ...(skipped ? { skippedResources: skipped } : {}),
      },
    }),
  );
}
