import { Storage } from "@google-cloud/storage";

export function transferBucketName(projectId: string): string {
  return `${projectId}-cloudshiftg-transfer`;
}

export async function ensureTransferBucket(projectId: string): Promise<string> {
  const storage = new Storage();
  const name = transferBucketName(projectId);
  const bucket = storage.bucket(name);
  const [exists] = await bucket.exists();
  if (!exists) {
    await storage.createBucket(name, {
      location: process.env.GCP_REGION?.trim() || "us-east1",
      uniformBucketLevelAccess: true,
    });
  }
  return name;
}

export async function uploadBufferToTransferBucket(
  projectId: string,
  objectPath: string,
  data: Buffer,
  contentType: string,
): Promise<{ bucketName: string; objectPath: string; gsUri: string; bytes: number }> {
  const bucketName = await ensureTransferBucket(projectId);
  const storage = new Storage();
  const file = storage.bucket(bucketName).file(objectPath);
  await file.save(data, {
    resumable: data.length > 5 * 1024 * 1024,
    contentType,
    metadata: { cacheControl: "no-cache" },
  });
  return {
    bucketName,
    objectPath,
    gsUri: `gs://${bucketName}/${objectPath}`,
    bytes: data.length,
  };
}

/** Object path for the Apply-time Cloud Functions placeholder zip. */
export const LAMBDA_PLACEHOLDER_OBJECT = "placeholders/lambda-stub.zip";
