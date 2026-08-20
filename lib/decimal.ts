import type { Prisma } from "@/lib/generated/prisma/client";

// Prisma returns Decimal columns as Decimal class instances, which aren't
// plain-serializable across the Server->Client Component boundary and don't
// match the plain `number | null` props components expect. Converts once at
// the data-read layer rather than making every consumer handle Decimal.
export function decimalToNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}
