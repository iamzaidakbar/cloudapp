import { prisma } from "@/lib/db";
import { withTenantContext } from "@/lib/db/with-tenant";
import type { AdminActionType, Prisma } from "@/lib/generated/prisma/client";

// AdminActionLog is RLS'd (see the model's own schema comment) — a
// tenant-scoped row is written via withTenantContext, same as every other
// table; a genuinely tenant-less row (a failed login to an unknown email, or
// a Platform Operator's own action) is written via the raw, unscoped
// `prisma` client, which the RLS policy specifically allows only for
// NULL-tenantId rows (see the RLS migration's comment) — never a bypass for
// tenant-scoped ones.
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
    if (params.tenantId) {
      const tenantId = params.tenantId;
      await withTenantContext(tenantId, (tx) => tx.adminActionLog.create({ data: { ...params, tenantId } }));
    } else {
      await prisma.adminActionLog.create({ data: params });
    }
  } catch (error) {
    console.error("Failed to write admin action log entry:", error);
  }
}

export function getRequestIp(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
