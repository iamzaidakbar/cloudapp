import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { setTenantContext } from "@/lib/db/with-tenant";
import { requireAdmin } from "@/lib/auth/guard";
import { generateExternalId } from "@/lib/aws/external-id";
import { tenantSchema } from "@/lib/validation/onboarding";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return apiError("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  const parsed = tenantSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const existing = await prisma.tenant.findFirst();
    if (existing) {
      return apiError("Organization already configured", 409);
    }

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: parsed.data.name } });
      await setTenantContext(tx, tenant.id);
      const connection = await tx.awsConnection.create({
        data: { tenantId: tenant.id, externalId: generateExternalId() },
      });
      return { tenant, connection };
    });

    return apiSuccess(result, 201);
  } catch (error) {
    console.error("Tenant creation failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
