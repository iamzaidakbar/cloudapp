import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // The app connects as a restricted, non-superuser role (APP_DATABASE_URL) —
  // never the Prisma-migration role in DATABASE_URL, which is a Postgres
  // superuser and would silently bypass row-level security policies.
  const adapter = new PrismaPg({ connectionString: env.APP_DATABASE_URL });
  return new PrismaClient({ adapter });
}

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  // After `prisma generate` adds models, a cached Next.js global client can
  // still be the pre-generate instance (delegates like transferRun missing).
  if (existing && typeof (existing as { transferRun?: unknown }).transferRun !== "undefined") {
    return existing;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();
