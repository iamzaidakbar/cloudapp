import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantAdmin, requireTenantScope } from "@/lib/auth/guard";
import { updateOrganizationSchema } from "@/lib/validation/settings";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";

export async function GET() {
  let admin;
  try {
    admin = await requireTenantScope();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: admin.tenantId },
    select: { id: true, name: true },
  });
  if (!tenant) {
    return apiError("Organization not found", 404);
  }

  return apiSuccess({ organization: tenant });
}

export async function PATCH(request: NextRequest) {
  let admin;
  try {
    admin = await requireTenantAdmin();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  const parsed = updateOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const organization = await prisma.tenant.update({
      where: { id: admin.tenantId },
      data: { name: parsed.data.name },
      select: { id: true, name: true },
    });
    return apiSuccess({ organization });
  } catch (error) {
    console.error("Update organization failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
