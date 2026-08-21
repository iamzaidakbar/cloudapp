import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { setTenantContext } from "@/lib/db/with-tenant";
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { generateExternalId } from "@/lib/aws/external-id";
import { registerSchema } from "@/lib/validation/onboarding";
import { apiError, apiSuccess } from "@/lib/api/response";
import { logAdminAction } from "@/lib/admin-action-log";

// Public, unauthenticated — this is where a brand-new customer organization
// and its first Tenant Admin come into existence. No requireAdmin() gate,
// no "one tenant per deployment" cap: multi-tenancy is the whole point (see
// this model's own schema comment, and FR-2.4/7.2's two-live-tenants
// requirement — Harshit registers his own org here exactly as a real
// customer would, no manual DB inserts).
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
  }

  const { organizationName, adminName, adminEmail, adminPassword } = parsed.data;

  try {
    const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
    if (existingAdmin) {
      return apiError("An account with this email already exists", 409, { adminEmail: ["Already in use"] });
    }

    const passwordHash = await hashPassword(adminPassword);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: organizationName } });
      // aws_connections is RLS'd (FORCE ROW LEVEL SECURITY) — without this,
      // the insert below fails with "new row violates row-level security
      // policy", confirmed the hard way against the real database.
      await setTenantContext(tx, tenant.id);
      const admin = await tx.admin.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: adminName || null,
          role: "TENANT_ADMIN",
          tenantId: tenant.id,
        },
      });
      const connection = await tx.awsConnection.create({
        data: { tenantId: tenant.id, externalId: generateExternalId() },
      });
      return { tenant, admin, connection };
    });

    const session = await getSession();
    session.adminId = result.admin.id;
    session.email = result.admin.email;
    await session.save();

    await logAdminAction({
      tenantId: result.tenant.id,
      adminId: result.admin.id,
      adminEmail: result.admin.email,
      action: "TENANT_CREATED",
      targetType: "Tenant",
      targetId: result.tenant.id,
    });

    return apiSuccess({ tenant: result.tenant, connection: result.connection }, 201);
  } catch (error) {
    console.error("Registration failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
