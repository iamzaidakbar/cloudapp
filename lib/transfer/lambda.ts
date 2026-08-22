import {
  LambdaClient,
  GetFunctionCommand,
} from "@aws-sdk/client-lambda";
import { getAccessToken } from "@/lib/gcp/auth";
import { slug } from "@/lib/terraform/generate";
import { toGcpRegion } from "@/lib/pricing/reference-data";
import { uploadBufferToTransferBucket } from "@/lib/transfer/transfer-bucket";

export type LambdaTransferResult = {
  objectsTransferred: number;
  bytesTransferred: number;
};

function cloudFunctionPathFromSelfLink(
  selfLink: string,
  projectId: string,
  region: string,
  awsResourceId: string,
): string {
  const trimmed = selfLink.trim();
  if (trimmed.startsWith("projects/")) return trimmed;
  const m = trimmed.match(/projects\/[^/]+\/locations\/[^/]+\/functions\/[^/?#]+/i);
  if (m?.[0]) return m[0];
  // bare name or id
  const name = trimmed.includes("/") ? slug(awsResourceId) : trimmed || slug(awsResourceId);
  return `projects/${projectId}/locations/${toGcpRegion(region)}/functions/${name}`;
}

async function waitForFunctionActive(functionPath: string, timeoutMs = 15 * 60 * 1000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const token = await getAccessToken();
    const res = await fetch(`https://cloudfunctions.googleapis.com/v2/${functionPath}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cloud Function poll failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const body = (await res.json()) as { state?: string; stateMessages?: Array<{ message?: string }> };
    if (body.state === "ACTIVE") return;
    if (body.state === "FAILED") {
      throw new Error(
        `Cloud Function deploy failed: ${body.stateMessages?.[0]?.message ?? "FAILED"}`,
      );
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Cloud Function did not become ACTIVE within ${Math.round(timeoutMs / 60000)} minutes`);
}

export async function transferLambdaFunction(options: {
  awsCredentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };
  region: string;
  awsResourceId: string;
  gcpResourceSelfLink: string | null;
  migrationPlanId: string;
  migrationResourceId: string;
  projectId: string;
}): Promise<LambdaTransferResult> {
  const client = new LambdaClient({
    region: options.region || "us-east-1",
    credentials: {
      accessKeyId: options.awsCredentials.accessKeyId,
      secretAccessKey: options.awsCredentials.secretAccessKey,
      sessionToken: options.awsCredentials.sessionToken,
    },
  });

  let fn;
  try {
    fn = await client.send(
      new GetFunctionCommand({ FunctionName: options.awsResourceId }),
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `lambda:GetFunction failed for ${options.awsResourceId}: ${msg}. ` +
        `Confirm the tenant role allows lambda:GetFunction.`,
    );
  }

  if (fn.Code?.ImageUri) {
    throw new Error(
      `Lambda ${options.awsResourceId} uses a container image — package zip transfer v1 only supports Zip-based functions.`,
    );
  }

  const location = fn.Code?.Location;
  if (!location) {
    throw new Error(`Lambda ${options.awsResourceId} returned no Code.Location download URL`);
  }

  const download = await fetch(location);
  if (!download.ok) {
    throw new Error(
      `Failed to download Lambda package (${download.status}) for ${options.awsResourceId}`,
    );
  }

  const data = Buffer.from(await download.arrayBuffer());
  if (data.length === 0) {
    throw new Error(`Downloaded Lambda package for ${options.awsResourceId} was empty`);
  }

  const objectPath = `${options.migrationPlanId}/${options.migrationResourceId}.zip`;
  const uploaded = await uploadBufferToTransferBucket(
    options.projectId,
    objectPath,
    data,
    "application/zip",
  );

  const functionPath = cloudFunctionPathFromSelfLink(
    options.gcpResourceSelfLink ?? "",
    options.projectId,
    options.region,
    options.awsResourceId,
  );

  const token = await getAccessToken();
  const patchBody = {
    buildConfig: {
      source: {
        storageSource: {
          bucket: uploaded.bucketName,
          object: uploaded.objectPath,
        },
      },
    },
  };

  const patch = await fetch(
    `https://cloudfunctions.googleapis.com/v2/${functionPath}?updateMask=buildConfig.source`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patchBody),
    },
  );
  if (!patch.ok) {
    const text = await patch.text();
    throw new Error(
      `Cloud Function source update failed (${patch.status}): ${text.slice(0, 400)}`,
    );
  }

  await waitForFunctionActive(functionPath);

  return {
    objectsTransferred: 1,
    bytesTransferred: uploaded.bytes || data.length,
  };
}
