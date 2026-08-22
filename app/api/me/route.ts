import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { updateProfileSchema } from "@/lib/validation/settings";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";

export async function GET() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  return apiSuccess({
    profile: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  });
}

export async function PATCH(request: NextRequest) {
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

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const updated = await prisma.admin.update({
      where: { id: admin.id },
      data: { name: parsed.data.name },
      select: { id: true, email: true, name: true, role: true },
    });
    return apiSuccess({ profile: updated });
  } catch (error) {
    console.error("Update profile failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
