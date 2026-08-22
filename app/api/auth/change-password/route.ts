import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { changePasswordSchema } from "@/lib/validation/auth";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";
import { logAdminAction, getRequestIp } from "@/lib/admin-action-log";
import { homePathForRole } from "@/lib/auth/home-path";

export async function POST(request: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
  }

  const { currentPassword, newPassword } = parsed.data;
  const ipAddress = getRequestIp(request);

  try {
    const row = await prisma.admin.findUnique({
      where: { id: admin.id },
      select: { passwordHash: true, role: true, tenantId: true },
    });
    if (!row) {
      return apiError("Unauthorized", 401);
    }

    const valid = await verifyPassword(currentPassword, row.passwordHash);
    if (!valid) {
      return apiError("Current password is incorrect", 400, {
        currentPassword: ["Current password is incorrect"],
      });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash, mustChangePassword: false },
    });

    await logAdminAction({
      tenantId: row.tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "PASSWORD_CHANGED",
      ipAddress,
    });

    return apiSuccess({
      redirectTo: homePathForRole(row.role),
    });
  } catch (error) {
    console.error("Change password failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
