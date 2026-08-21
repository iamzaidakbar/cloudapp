import { prisma } from "@/lib/db";
import type { AdminActionType, Prisma } from "@/lib/generated/prisma/client";

// AdminActionLog is deliberately not tenant-scoped / not covered by RLS —
// see the model's own schema comment — so this writes via the raw `prisma`
// client, same as lib/pricing/cache.ts's PricingCache access.
//
// Never throws: a logging failure must never turn an otherwise-successful
// admin action into a user-facing 500. Every call site fires this after its
// real work has already succeeded (or, for a failed login, after auth has
// already failed) — the action itself is never gated on logging succeeding.
export async function logAdminAction(params: {
  tenantId?: string | null;
  adminId?: string | null;
  adminEmail: string;
  action: AdminActionType;
  targetType?: string;
  targetId?: string;
  detail?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await prisma.adminActionLog.create({ data: params });
  } catch (error) {
    console.error("Failed to write admin action log entry:", error);
  }
}

export function getRequestIp(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
