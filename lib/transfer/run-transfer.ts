import { Storage } from "@google-cloud/storage";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { withTenantContext } from "@/lib/db/with-tenant";
import { assumeTenantRole } from "@/lib/aws/sts";
import { isAwsConfigured } from "@/lib/aws/is-configured";
import { gcsBucketNameFromSelfLink } from "@/lib/transfer/gcs-bucket";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  type _Object,
} from "@aws-sdk/client-s3";

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

export async function runTransfer(transferRunId: string, tenantId: string): Promise<void> {
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

  const skipped: SkippedResource[] = [];
  const eligible = resources.filter((r) => {
    if (r.awsService !== "S3_BUCKET") {
      skipped.push({
        migrationResourceId: r.id,
        awsService: r.awsService,
        awsResourceId: r.awsResourceId,
        reason: "not supported in data-transfer v1 (S3→GCS only)",
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
    return true;
  });

  if (eligible.length === 0) {
    await withTenantContext(tenantId, (tx) =>
      tx.transferRun.update({
        where: { id: transferRunId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          errorMessage: "No provisioned S3→GCS resources to transfer.",
          objectsCopied: 0,
          bytesCopied: BigInt(0),
          skippedResources: skipped,
        },
      }),
    );
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

    let totalObjects = 0;
    let totalBytes = 0;

    for (const resource of eligible) {
      const s3Bucket = resource.awsResourceName ?? resource.awsResourceId;
      const gcsBucket = gcsBucketNameFromSelfLink(resource.gcpResourceSelfLink!);
      if (!gcsBucket) {
        throw new Error(`Could not parse GCS bucket from ${resource.gcpResourceSelfLink}`);
      }

      const regionalS3 = new S3Client({
        region: resource.region || "us-east-1",
        credentials: credentialsFor(creds),
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

      // Verify counts and total sizes match.
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
