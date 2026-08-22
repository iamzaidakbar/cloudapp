import {
  ensureTransferBucket,
  LAMBDA_PLACEHOLDER_OBJECT,
  transferBucketName,
} from "@/lib/transfer/transfer-bucket";
import { Storage } from "@google-cloud/storage";

/**
 * Minimal zip with index.js exporting `handler` (nodejs20).
 * Generated via Compress-Archive; uploaded once per project for Apply.
 */
const STUB_ZIP_BASE64 =
  "UEsDBBQAAAAIAA+JFl2cGm0/VwAAAFcAAAAIAAAAaW5kZXguanMFwcEKQEAQBuC78g5/e6KQHImLJ1k7w6rNaGcVybv7Pr5PiUkbbw8KHDHC6nM4FCXGCcULTTZdOgtxj65tKyxCTw/jglykfl/TVp/BOvYSiKPBVw559gNQSwECFAAUAAAACAAPiRZdnBptP1cAAABXAAAACAAAAAAAAAAAAAAAAAAAAAAAaW5kZXguanNQSwUGAAAAAAEAAQA2AAAAfQAAAAAA";

export async function ensureLambdaPlaceholderZip(projectId: string): Promise<{
  bucketName: string;
  objectPath: string;
}> {
  const bucketName = await ensureTransferBucket(projectId);
  const storage = new Storage();
  const file = storage.bucket(bucketName).file(LAMBDA_PLACEHOLDER_OBJECT);
  const [exists] = await file.exists();
  if (!exists) {
    await file.save(Buffer.from(STUB_ZIP_BASE64, "base64"), {
      contentType: "application/zip",
      resumable: false,
    });
  }
  return { bucketName, objectPath: LAMBDA_PLACEHOLDER_OBJECT };
}

export function lambdaPlaceholderBucket(projectId: string): string {
  return transferBucketName(projectId);
}
