import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const admin = await requireAdmin();

    const [adminCount, me] = await Promise.all([
      prisma.admin.count(),
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
