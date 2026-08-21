import { prisma } from "@/lib/db";
import { requireTenantScope } from "@/lib/auth/guard";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const admin = await requireTenantScope();

    const [adminCount, me] = await Promise.all([
      // Scoped to this admin's own tenant — a tenant-wide admin count, not a
      // global one, so Tenant A's dashboard never reveals Tenant B's team size.
      prisma.admin.count({ where: { tenantId: admin.tenantId } }),
      prisma.admin.findUnique({
        where: { id: admin.id },
        select: { lastLoginAt: true },
      }),
    ]);

    return apiSuccess({
      adminCount,
      lastLoginAt: me?.lastLoginAt ?? null,
    });
  } catch (error) {
    console.error("Dashboard summary failed:", error);
    return apiError("Unauthorized", 401);
  }
}
