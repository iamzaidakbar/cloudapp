import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validation/auth";
import { apiError, apiSuccess } from "@/lib/api/response";
import { logAdminAction, getRequestIp } from "@/lib/admin-action-log";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
  }

  const { email, password } = parsed.data;
  const ipAddress = getRequestIp(request);

  try {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      await logAdminAction({ adminId: null, adminEmail: email, action: "LOGIN_FAILED", ipAddress });
      return apiError("Invalid email or password", 401);
    }

    const isValid = await verifyPassword(password, admin.passwordHash);
    if (!isValid) {
      await logAdminAction({ adminId: null, adminEmail: email, action: "LOGIN_FAILED", ipAddress });
      return apiError("Invalid email or password", 401);
    }

    const session = await getSession();
    session.adminId = admin.id;
    session.email = admin.email;
    session.role = admin.role;
    await session.save();

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    await logAdminAction({ adminId: admin.id, adminEmail: admin.email, action: "LOGIN_SUCCEEDED", ipAddress });

    return apiSuccess({
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        mustChangePassword: admin.mustChangePassword,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
