import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

// PricingCache is public list pricing, identical for every tenant — reads
// via the raw `prisma` client (not withTenantContext/RLS), same as any other
// non-tenant reference data. Never used to store anything tenant-specific.
export async function getCached<T>(provider: "AWS" | "GCP", cacheKey: string): Promise<T | null> {
  const row = await prisma.pricingCache.findUnique({ where: { provider_cacheKey: { provider, cacheKey } } });
  if (!row || row.expiresAt <= new Date()) return null;
  return row.payload as T;
}

export async function setCached(provider: "AWS" | "GCP", cacheKey: string, payload: unknown, ttlMs: number) {
  await prisma.pricingCache.upsert({
    where: { provider_cacheKey: { provider, cacheKey } },
    create: { provider, cacheKey, payload: payload as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + ttlMs) },
    update: { payload: payload as Prisma.InputJsonValue, fetchedAt: new Date(), expiresAt: new Date(Date.now() + ttlMs) },
  });
}

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
