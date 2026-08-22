import { Storage } from "@google-cloud/storage";

/** Extract GCS bucket name from a storage self_link or gs:// URL. */
export function gcsBucketNameFromSelfLink(selfLink: string): string | null {
  const trimmed = selfLink.trim();
  const gs = trimmed.match(/^gs:\/\/([^/]+)/i);
  if (gs?.[1]) return gs[1];

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const bIndex = parts.findIndex((p) => p === "b");
    if (bIndex >= 0 && parts[bIndex + 1]) return decodeURIComponent(parts[bIndex + 1]);
    if (parts.length === 1) return decodeURIComponent(parts[0]!);
  } catch {
    // fall through
  }

  if (/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/i.test(trimmed) && !trimmed.includes("/")) {
    return trimmed;
  }
  return null;
}

/** Delete all objects in a GCS bucket (needed before terraform destroy). */
export async function emptyGcsBucket(bucketName: string): Promise<number> {
  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  const [files] = await bucket.getFiles();
  if (files.length === 0) return 0;
  await bucket.deleteFiles({ force: true });
  return files.length;
}
