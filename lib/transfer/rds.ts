import { mkdir, unlink, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import {
  RDSClient,
  DescribeDBInstancesCommand,
  type DBInstance,
} from "@aws-sdk/client-rds";
import { slug } from "@/lib/terraform/generate";
import {
  cloudSqlInstanceNameFromSelfLink,
  ensureTransferBucket,
  importSqlDumpToCloudSql,
  uploadSqlDump,
} from "@/lib/transfer/cloud-sql-import";
import type { RdsCredential } from "@/lib/transfer/rds-credentials";

export type RdsTransferResult = {
  objectsTransferred: number;
  bytesTransferred: number;
  database: string;
  engine: "mysql" | "postgres";
};

function normalizeEngine(engine: string | undefined): "mysql" | "postgres" {
  const e = (engine ?? "").toLowerCase();
  if (e.includes("postgres")) return "postgres";
  if (e.includes("mysql") || e.includes("mariadb")) return "mysql";
  throw new Error(
    `Unsupported RDS engine "${engine ?? "unknown"}" — only MySQL and PostgreSQL are supported for data transfer`,
  );
}

export function resolveImportDatabase(
  engine: "mysql" | "postgres",
  sourceDb: string | null,
): string {
  if (sourceDb) return sourceDb;
  return engine === "postgres" ? "postgres" : "app";
}

function runDump(
  command: string,
  args: string[],
  env: Record<string, string>,
  outPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const out = createWriteStream(outPath);
    let stderr = "";
    child.stdout.pipe(out);
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });
    child.on("error", (err) => {
      out.close();
      reject(
        new Error(
          `Failed to start ${command}: ${err.message}. Ensure default-mysql-client / postgresql-client is installed in the Job image.`,
        ),
      );
    });
    out.on("error", (err) => {
      reject(err);
    });
    child.on("close", (code) => {
      out.end(() => {
        if (code === 0) resolve();
        else {
          const cleaned = stderr.replace(/password/gi, "***").slice(0, 500);
          reject(new Error(`${command} exited ${code}: ${cleaned || "no stderr"}`));
        }
      });
    });
  });
}

async function dumpMysql(options: {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string | null;
  outPath: string;
}): Promise<void> {
  const args = [
    `-h${options.host}`,
    `-P${String(options.port)}`,
    `-u${options.username}`,
    "--single-transaction",
    "--routines",
    "--events",
    "--set-gtid-purged=OFF",
  ];
  if (options.database) {
    args.push("--databases", options.database);
  } else {
    args.push("--all-databases");
  }
  await runDump("mysqldump", args, { MYSQL_PWD: options.password }, options.outPath);
}

async function dumpPostgres(options: {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  outPath: string;
}): Promise<void> {
  await runDump(
    "pg_dump",
    [
      "-h",
      options.host,
      "-p",
      String(options.port),
      "-U",
      options.username,
      "-d",
      options.database,
      "--no-owner",
      "--no-acl",
      "-F",
      "p",
    ],
    { PGPASSWORD: options.password },
    options.outPath,
  );
}

export async function transferRdsInstance(options: {
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
  credential: RdsCredential;
  projectId: string;
}): Promise<RdsTransferResult> {
  const client = new RDSClient({
    region: options.region || "us-east-1",
    credentials: {
      accessKeyId: options.awsCredentials.accessKeyId,
      secretAccessKey: options.awsCredentials.secretAccessKey,
      sessionToken: options.awsCredentials.sessionToken,
    },
  });

  let instance: DBInstance | undefined;
  try {
    const described = await client.send(
      new DescribeDBInstancesCommand({
        DBInstanceIdentifier: options.awsResourceId,
      }),
    );
    instance = described.DBInstances?.[0];
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `DescribeDBInstances failed for ${options.awsResourceId}: ${msg}. ` +
        `Confirm the tenant role has rds:DescribeDBInstances and the identifier is correct.`,
    );
  }

  if (!instance?.Endpoint?.Address) {
    throw new Error(`RDS instance ${options.awsResourceId} has no endpoint address`);
  }

  if (instance.PubliclyAccessible === false) {
    throw new Error(
      `RDS instance ${options.awsResourceId} is not publicly accessible. ` +
        `v1 data transfer requires a publicly reachable endpoint (or network path from the Job). ` +
        `Private-only RDS without VPC peering is not supported in this slice.`,
    );
  }

  const engine = normalizeEngine(instance.Engine);
  const host = instance.Endpoint.Address;
  const port = instance.Endpoint.Port ?? (engine === "postgres" ? 5432 : 3306);
  const username =
    options.credential.username?.trim() ||
    instance.MasterUsername ||
    (engine === "postgres" ? "postgres" : "admin");
  const sourceDb = instance.DBName?.trim() || null;
  const importDatabase = resolveImportDatabase(engine, sourceDb);

  const instanceId =
    (options.gcpResourceSelfLink
      ? cloudSqlInstanceNameFromSelfLink(options.gcpResourceSelfLink)
      : null) || slug(options.awsResourceId);

  const workDir = join(tmpdir(), `cloudshiftg-rds-${options.migrationResourceId.slice(0, 12)}`);
  await mkdir(workDir, { recursive: true });
  const dumpPath = join(workDir, "dump.sql");

  try {
    if (engine === "mysql") {
      await dumpMysql({
        host,
        port,
        username,
        password: options.credential.password,
        database: sourceDb,
        outPath: dumpPath,
      });
    } else {
      await dumpPostgres({
        host,
        port,
        username,
        password: options.credential.password,
        database: sourceDb || "postgres",
        outPath: dumpPath,
      });
    }

    const dumpStat = await stat(dumpPath);
    if (dumpStat.size === 0) {
      throw new Error(`Dump for ${options.awsResourceId} was empty (0 bytes)`);
    }

    const bucketName = await ensureTransferBucket(options.projectId);
    const objectPath = `${options.migrationPlanId}/${options.migrationResourceId}.sql`;
    const uploaded = await uploadSqlDump(bucketName, objectPath, dumpPath);

    await importSqlDumpToCloudSql({
      projectId: options.projectId,
      instanceId,
      gsUri: uploaded.gsUri,
      database: importDatabase,
      engine,
      bucketName,
      omitDatabaseInImport: engine === "mysql" && !sourceDb,
    });

    return {
      objectsTransferred: 1,
      bytesTransferred: uploaded.bytes || dumpStat.size,
      database: importDatabase,
      engine,
    };
  } finally {
    try {
      await unlink(dumpPath);
    } catch {
      // ignore cleanup failures
    }
  }
}
