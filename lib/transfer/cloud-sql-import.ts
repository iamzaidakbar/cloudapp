import { Storage } from "@google-cloud/storage";
import { randomBytes } from "node:crypto";
import { getAccessToken } from "@/lib/gcp/auth";
import {
  ensureTransferBucket,
  transferBucketName,
} from "@/lib/transfer/transfer-bucket";

export { ensureTransferBucket, transferBucketName };

const SQL_ADMIN = "https://sqladmin.googleapis.com/v1";

export function cloudSqlInstanceNameFromSelfLink(selfLink: string): string | null {
  const trimmed = selfLink.trim();
  // https://sqladmin.googleapis.com/sql/v1beta4/projects/P/instances/I
  // or .../v1/projects/P/instances/I
  const m = trimmed.match(/\/instances\/([^/?#]+)/i);
  if (m?.[1]) return decodeURIComponent(m[1]);
  // bare instance name
  if (/^[a-z][a-z0-9-]{0,95}$/i.test(trimmed) && !trimmed.includes("/")) {
    return trimmed;
  }
  return null;
}

async function sqlAdminFetch(
  path: string,
  init: RequestInit & { method?: string } = {},
): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`${SQL_ADMIN}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function waitForOperation(
  projectId: string,
  operationName: string,
  label: string,
  timeoutMs = 60 * 60 * 1000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await sqlAdminFetch(`/projects/${projectId}/operations/${operationName}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cloud SQL operation poll failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const body = (await res.json()) as {
      status?: string;
      error?: { errors?: Array<{ message?: string }> };
    };
    if (body.status === "DONE") {
      const errMsg = body.error?.errors?.[0]?.message;
      if (errMsg) throw new Error(`${label} failed: ${errMsg}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`${label} timed out after ${Math.round(timeoutMs / 60000)} minutes`);
}

async function getInstance(
  projectId: string,
  instanceId: string,
): Promise<{
  state?: string;
  databaseVersion?: string;
  serviceAccountEmailAddress?: string;
}> {
  const res = await sqlAdminFetch(`/projects/${projectId}/instances/${instanceId}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloud SQL instance lookup failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as {
    state?: string;
    databaseVersion?: string;
    serviceAccountEmailAddress?: string;
  };
}

async function ensureDatabase(projectId: string, instanceId: string, database: string): Promise<void> {
  const list = await sqlAdminFetch(
    `/projects/${projectId}/instances/${instanceId}/databases`,
  );
  if (list.ok) {
    const body = (await list.json()) as { items?: Array<{ name?: string }> };
    if (body.items?.some((d) => d.name === database)) return;
  }

  const create = await sqlAdminFetch(
    `/projects/${projectId}/instances/${instanceId}/databases`,
    {
      method: "POST",
      body: JSON.stringify({ name: database, project: projectId, instance: instanceId }),
    },
  );
  if (!create.ok) {
    const text = await create.text();
    // Already exists races
    if (create.status === 409 || /already exists/i.test(text)) return;
    throw new Error(`Create Cloud SQL database failed (${create.status}): ${text.slice(0, 300)}`);
  }
  const op = (await create.json()) as { name?: string };
  if (op.name) {
    const opId = op.name.includes("/") ? op.name.split("/").pop()! : op.name;
    await waitForOperation(projectId, opId, `Create database ${database}`, 15 * 60 * 1000);
  }
}

async function ensureImportUser(
  projectId: string,
  instanceId: string,
  engine: "mysql" | "postgres",
): Promise<{ name: string; password: string }> {
  // Prefer the built-in superuser so Cloud SQL import has sufficient privileges.
  const name = engine === "mysql" ? "root" : "postgres";
  const password = randomBytes(24).toString("base64url");
  const body =
    engine === "mysql"
      ? { name, password, host: "%" }
      : { name, password };

  const hostQuery = engine === "mysql" ? "&host=%25" : "";
  const update = await sqlAdminFetch(
    `/projects/${projectId}/instances/${instanceId}/users?name=${encodeURIComponent(name)}${hostQuery}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );

  if (update.ok) {
    const op = (await update.json()) as { name?: string };
    if (op.name) {
      const opId = op.name.includes("/") ? op.name.split("/").pop()! : op.name;
      await waitForOperation(projectId, opId, `Update ${name} password`, 10 * 60 * 1000);
    }
    return { name, password };
  }

  const updateErr = await update.text();

  // Instance may not have the user yet — create then.
  const create = await sqlAdminFetch(`/projects/${projectId}/instances/${instanceId}/users`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!create.ok) {
    const text = await create.text();
    throw new Error(
      `Could not set Cloud SQL ${name} password (update ${update.status}: ${updateErr.slice(0, 200)}; create ${create.status}: ${text.slice(0, 200)})`,
    );
  }
  const op = (await create.json()) as { name?: string };
  if (op.name) {
    const opId = op.name.includes("/") ? op.name.split("/").pop()! : op.name;
    await waitForOperation(projectId, opId, `Create ${name} user`, 10 * 60 * 1000);
  }
  return { name, password };
}

async function grantCloudSqlSaRead(
  bucketName: string,
  serviceAccountEmail: string,
): Promise<void> {
  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  const [policy] = await bucket.iam.getPolicy({ requestedPolicyVersion: 3 });
  const role = "roles/storage.objectViewer";
  const member = `serviceAccount:${serviceAccountEmail}`;
  const bindings = policy.bindings ?? [];
  const existing = bindings.find((b) => b.role === role);
  if (existing) {
    if (!existing.members?.includes(member)) {
      existing.members = [...(existing.members ?? []), member];
    }
  } else {
    bindings.push({ role, members: [member] });
  }
  policy.bindings = bindings;
  await bucket.iam.setPolicy(policy);
}

export async function uploadSqlDump(
  bucketName: string,
  objectPath: string,
  localPath: string,
): Promise<{ gsUri: string; bytes: number }> {
  const storage = new Storage();
  const file = storage.bucket(bucketName).file(objectPath);
  await storage.bucket(bucketName).upload(localPath, {
    destination: objectPath,
    resumable: true,
    metadata: { contentType: "application/sql" },
  });
  const [meta] = await file.getMetadata();
  const bytes = Number(meta.size ?? 0);
  return { gsUri: `gs://${bucketName}/${objectPath}`, bytes };
}

export async function importSqlDumpToCloudSql(options: {
  projectId: string;
  instanceId: string;
  gsUri: string;
  database: string;
  engine: "mysql" | "postgres";
  bucketName: string;
  /** When true (MySQL --all-databases), omit importContext.database. */
  omitDatabaseInImport?: boolean;
}): Promise<void> {
  const instance = await getInstance(options.projectId, options.instanceId);
  if (instance.state && instance.state !== "RUNNABLE") {
    throw new Error(
      `Cloud SQL instance ${options.instanceId} is ${instance.state}, expected RUNNABLE`,
    );
  }

  if (!instance.serviceAccountEmailAddress) {
    throw new Error(`Cloud SQL instance ${options.instanceId} has no service account email`);
  }

  await grantCloudSqlSaRead(options.bucketName, instance.serviceAccountEmailAddress);

  if (!options.omitDatabaseInImport) {
    await ensureDatabase(options.projectId, options.instanceId, options.database);
  }

  const importUser = await ensureImportUser(
    options.projectId,
    options.instanceId,
    options.engine,
  );

  const importBody = {
    importContext: {
      fileType: "SQL",
      uri: options.gsUri,
      importUser: importUser.name,
      ...(options.omitDatabaseInImport ? {} : { database: options.database }),
    },
  };

  const res = await sqlAdminFetch(
    `/projects/${options.projectId}/instances/${options.instanceId}/import`,
    { method: "POST", body: JSON.stringify(importBody) },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloud SQL import start failed (${res.status}): ${text.slice(0, 400)}`);
  }
  const op = (await res.json()) as { name?: string };
  if (!op.name) throw new Error("Cloud SQL import returned no operation name");
  const opId = op.name.includes("/") ? op.name.split("/").pop()! : op.name;
  await waitForOperation(
    options.projectId,
    opId,
    `Import into ${options.instanceId}/${options.database}`,
    2 * 60 * 60 * 1000,
  );
}
