import { createWriteStream } from "node:fs";
import { mkdir, unlink, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getAccessToken } from "@/lib/gcp/auth";
import { slug } from "@/lib/terraform/generate";
import { toGcpZone } from "@/lib/pricing/reference-data";
import { ensureTransferBucket } from "@/lib/transfer/transfer-bucket";
import { Storage } from "@google-cloud/storage";
import {
  EC2Client,
  DescribeInstancesCommand,
  CreateImageCommand,
  DescribeImagesCommand,
  ExportImageCommand,
  DescribeExportImageTasksCommand,
} from "@aws-sdk/client-ec2";
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand as S3CreateBucketCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

export type Ec2TransferResult = {
  objectsTransferred: number;
  bytesTransferred: number;
};

function parseGceInstance(selfLink: string): { project: string; zone: string; name: string } | null {
  const m = selfLink.match(/\/projects\/([^/]+)\/zones\/([^/]+)\/instances\/([^/?#]+)/i);
  if (!m) return null;
  return { project: m[1]!, zone: m[2]!, name: decodeURIComponent(m[3]!) };
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitForAmi(
  client: EC2Client,
  imageId: string,
  timeoutMs = 45 * 60 * 1000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await client.send(new DescribeImagesCommand({ ImageIds: [imageId] }));
    const state = res.Images?.[0]?.State;
    if (state === "available") return;
    if (state === "failed" || state === "error") {
      throw new Error(`AMI ${imageId} entered state ${state}`);
    }
    await sleep(15000);
  }
  throw new Error(`AMI ${imageId} did not become available in time`);
}

async function waitForExport(
  client: EC2Client,
  exportTaskId: string,
  timeoutMs = 2 * 60 * 60 * 1000,
): Promise<{ s3Bucket: string; s3Prefix: string }> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await client.send(
      new DescribeExportImageTasksCommand({ ExportImageTaskIds: [exportTaskId] }),
    );
    const task = res.ExportImageTasks?.[0];
    if (!task) {
      await sleep(20000);
      continue;
    }
    const status = task.Status;
    if (status === "completed") {
      const bucket = task.S3ExportLocation?.S3Bucket;
      const prefix = task.S3ExportLocation?.S3Prefix ?? "";
      if (!bucket) throw new Error(`Export ${exportTaskId} completed without S3 location`);
      return { s3Bucket: bucket, s3Prefix: prefix };
    }
    if (status === "failed" || status === "deleted") {
      throw new Error(
        `AMI export ${exportTaskId} ${status}: ${task.StatusMessage ?? "no detail"}`,
      );
    }
    await sleep(20000);
  }
  throw new Error(`AMI export ${exportTaskId} timed out`);
}

async function ensureAmiExportBucket(
  s3: S3Client,
  bucketName: string,
  region: string,
): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    return;
  } catch {
    // create below
  }
  try {
    await s3.send(
      new S3CreateBucketCommand(
        region === "us-east-1"
          ? { Bucket: bucketName }
          : {
              Bucket: bucketName,
              CreateBucketConfiguration: { LocationConstraint: region as never },
            },
      ),
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!/BucketAlreadyOwnedByYou|BucketAlreadyExists/i.test(msg)) {
      throw new Error(
        `Could not create AMI export bucket s3://${bucketName}: ${msg}. ` +
          `ExportImage requires an S3 bucket and a vmimport service role.`,
      );
    }
  }
}

async function computeFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`https://compute.googleapis.com/compute/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function waitComputeOp(
  project: string,
  zone: string | null,
  operationName: string,
  label: string,
  timeoutMs = 30 * 60 * 1000,
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const path = zone
      ? `/projects/${project}/zones/${zone}/operations/${operationName}`
      : `/projects/${project}/global/operations/${operationName}`;
    const res = await computeFetch(path);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Compute op poll failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const body = (await res.json()) as {
      status?: string;
      error?: { errors?: Array<{ message?: string }> };
    };
    if (body.status === "DONE") {
      const err = body.error?.errors?.[0]?.message;
      if (err) throw new Error(`${label} failed: ${err}`);
      return;
    }
    await sleep(5000);
  }
  throw new Error(`${label} timed out`);
}

async function replaceGceBootDisk(options: {
  projectId: string;
  zone: string;
  instanceName: string;
  imageName: string;
}): Promise<void> {
  const { projectId, zone, instanceName, imageName } = options;
  const stop = await computeFetch(
    `/projects/${projectId}/zones/${zone}/instances/${instanceName}/stop`,
    { method: "POST" },
  );
  if (stop.ok) {
    const op = (await stop.json()) as { name?: string };
    if (op.name) await waitComputeOp(projectId, zone, op.name, "Stop instance");
  } else {
    const text = await stop.text();
    if (!/already stopped|TERMINATED/i.test(text)) {
      throw new Error(`Stop GCE instance failed (${stop.status}): ${text.slice(0, 300)}`);
    }
  }

  for (let i = 0; i < 60; i++) {
    const get = await computeFetch(
      `/projects/${projectId}/zones/${zone}/instances/${instanceName}`,
    );
    if (get.ok) {
      const body = (await get.json()) as { status?: string };
      if (body.status === "TERMINATED") break;
    }
    await sleep(5000);
  }

  const diskName = `${instanceName}-xfer-${Date.now().toString(36).slice(-6)}`;
  const createDisk = await computeFetch(`/projects/${projectId}/zones/${zone}/disks`, {
    method: "POST",
    body: JSON.stringify({
      name: diskName,
      sourceImage: `projects/${projectId}/global/images/${imageName}`,
      type: `zones/${zone}/diskTypes/pd-balanced`,
    }),
  });
  if (!createDisk.ok) {
    const text = await createDisk.text();
    throw new Error(`Create disk from image failed (${createDisk.status}): ${text.slice(0, 400)}`);
  }
  const diskOp = (await createDisk.json()) as { name?: string };
  if (diskOp.name) await waitComputeOp(projectId, zone, diskOp.name, "Create boot disk");

  const instRes = await computeFetch(
    `/projects/${projectId}/zones/${zone}/instances/${instanceName}`,
  );
  if (!instRes.ok) {
    throw new Error(`Describe GCE instance failed (${instRes.status})`);
  }
  const inst = (await instRes.json()) as {
    disks?: Array<{ boot?: boolean; deviceName?: string }>;
  };
  const boot = inst.disks?.find((d) => d.boot);
  if (boot?.deviceName) {
    const detach = await computeFetch(
      `/projects/${projectId}/zones/${zone}/instances/${instanceName}/detachDisk?deviceName=${encodeURIComponent(boot.deviceName)}`,
      { method: "POST" },
    );
    if (detach.ok) {
      const op = (await detach.json()) as { name?: string };
      if (op.name) await waitComputeOp(projectId, zone, op.name, "Detach old boot disk");
    }
  }

  const attach = await computeFetch(
    `/projects/${projectId}/zones/${zone}/instances/${instanceName}/attachDisk`,
    {
      method: "POST",
      body: JSON.stringify({
        source: `projects/${projectId}/zones/${zone}/disks/${diskName}`,
        boot: true,
        autoDelete: true,
      }),
    },
  );
  if (!attach.ok) {
    const text = await attach.text();
    throw new Error(`Attach new boot disk failed (${attach.status}): ${text.slice(0, 400)}`);
  }
  const attachOp = (await attach.json()) as { name?: string };
  if (attachOp.name) await waitComputeOp(projectId, zone, attachOp.name, "Attach boot disk");

  const start = await computeFetch(
    `/projects/${projectId}/zones/${zone}/instances/${instanceName}/start`,
    { method: "POST" },
  );
  if (start.ok) {
    const op = (await start.json()) as { name?: string };
    if (op.name) await waitComputeOp(projectId, zone, op.name, "Start instance");
  }
}

export async function transferEc2Instance(options: {
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
}): Promise<Ec2TransferResult> {
  const region = options.region || "us-east-1";
  const creds = {
    accessKeyId: options.awsCredentials.accessKeyId,
    secretAccessKey: options.awsCredentials.secretAccessKey,
    sessionToken: options.awsCredentials.sessionToken,
  };
  const ec2 = new EC2Client({ region, credentials: creds });
  const s3 = new S3Client({ region, credentials: creds });

  const described = await ec2.send(
    new DescribeInstancesCommand({ InstanceIds: [options.awsResourceId] }),
  );
  const instance = described.Reservations?.[0]?.Instances?.[0];
  if (!instance?.InstanceId) {
    throw new Error(`EC2 instance ${options.awsResourceId} not found`);
  }

  if (instance.State?.Name !== "running" && instance.State?.Name !== "stopped") {
    throw new Error(
      `EC2 instance ${options.awsResourceId} is ${instance.State?.Name ?? "unknown"} — need running or stopped for AMI transfer`,
    );
  }

  const imageName = `cloudshiftg-${slug(options.awsResourceId).slice(0, 40)}-${Date.now()
    .toString(36)
    .slice(-6)}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

  let createImage;
  try {
    createImage = await ec2.send(
      new CreateImageCommand({
        InstanceId: instance.InstanceId,
        Name: imageName,
        Description: `CloudShift-G transfer ${options.migrationResourceId}`,
        NoReboot: true,
      }),
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`CreateImage failed: ${msg}`);
  }

  const amiId = createImage.ImageId;
  if (!amiId) throw new Error("CreateImage returned no ImageId");
  await waitForAmi(ec2, amiId);

  const ownerId = described.Reservations?.[0]?.OwnerId || instance.NetworkInterfaces?.[0]?.OwnerId;
  const exportBucket =
    process.env.AWS_AMI_EXPORT_BUCKET?.trim() ||
    `cloudshiftg-ami-export-${ownerId ?? "acct"}`.toLowerCase().slice(0, 63);
  await ensureAmiExportBucket(s3, exportBucket, region);

  let exportTask;
  try {
    exportTask = await ec2.send(
      new ExportImageCommand({
        ImageId: amiId,
        DiskImageFormat: "RAW",
        S3ExportLocation: {
          S3Bucket: exportBucket,
          S3Prefix: `cloudshiftg/${options.migrationPlanId}/${options.migrationResourceId}/`,
        },
      }),
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `ExportImage failed: ${msg}. ` +
        `v1 EC2 transfer requires ExportImage permissions and a vmimport service role that can write to s3://${exportBucket}.`,
    );
  }

  const exportTaskId = exportTask.ExportImageTaskId;
  if (!exportTaskId) throw new Error("ExportImage returned no task id");
  const exportLoc = await waitForExport(ec2, exportTaskId);

  const listed = await s3.send(
    new ListObjectsV2Command({
      Bucket: exportLoc.s3Bucket,
      Prefix: exportLoc.s3Prefix,
    }),
  );
  const object = listed.Contents?.sort((a, b) => (b.Size ?? 0) - (a.Size ?? 0))[0];
  if (!object?.Key) {
    throw new Error(
      `AMI export completed but no object found under s3://${exportLoc.s3Bucket}/${exportLoc.s3Prefix}`,
    );
  }

  const get = await s3.send(
    new GetObjectCommand({ Bucket: exportLoc.s3Bucket, Key: object.Key }),
  );
  if (!get.Body) throw new Error(`Empty body for s3://${exportLoc.s3Bucket}/${object.Key}`);

  const workDir = join(tmpdir(), `cloudshiftg-ec2-${options.migrationResourceId.slice(0, 12)}`);
  await mkdir(workDir, { recursive: true });
  const localPath = join(workDir, "disk.raw");

  try {
    await pipeline(get.Body as Readable, createWriteStream(localPath));
    const fileStat = await stat(localPath);

    const bucketName = await ensureTransferBucket(options.projectId);
    const gcsObject = `${options.migrationPlanId}/${options.migrationResourceId}.raw`;
    const storage = new Storage();
    await storage.bucket(bucketName).upload(localPath, {
      destination: gcsObject,
      resumable: true,
      metadata: { contentType: "application/octet-stream" },
    });

    let sourceUrl = `https://storage.googleapis.com/${bucketName}/${gcsObject}`;
    try {
      const [signed] = await storage.bucket(bucketName).file(gcsObject).getSignedUrl({
        action: "read",
        expires: Date.now() + 6 * 60 * 60 * 1000,
      });
      sourceUrl = signed;
    } catch {
      // fall back to https URL (requires object to be readable by compute)
    }

    const gceImageName = `xfer-${slug(options.awsResourceId)}-${Date.now().toString(36).slice(-5)}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .slice(0, 62);

    const createImageGcp = await computeFetch(`/projects/${options.projectId}/global/images`, {
      method: "POST",
      body: JSON.stringify({
        name: gceImageName,
        rawDisk: { source: sourceUrl },
      }),
    });
    if (!createImageGcp.ok) {
      const text = await createImageGcp.text();
      throw new Error(
        `GCE images.insert failed (${createImageGcp.status}): ${text.slice(0, 400)}. ` +
          `Confirm the Job SA can create images and read the transfer GCS object.`,
      );
    }
    const imgOp = (await createImageGcp.json()) as { name?: string };
    if (imgOp.name) {
      await waitComputeOp(options.projectId, null, imgOp.name, "Create GCE image", 60 * 60 * 1000);
    }

    const parsed =
      (options.gcpResourceSelfLink ? parseGceInstance(options.gcpResourceSelfLink) : null) || {
        project: options.projectId,
        zone: toGcpZone(region),
        name: slug(options.awsResourceId),
      };

    await replaceGceBootDisk({
      projectId: parsed.project,
      zone: parsed.zone,
      instanceName: parsed.name,
      imageName: gceImageName,
    });

    return {
      objectsTransferred: 1,
      bytesTransferred: fileStat.size,
    };
  } finally {
    try {
      await unlink(localPath);
    } catch {
      // ignore
    }
  }
}
