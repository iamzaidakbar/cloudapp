import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantAdmin } from "@/lib/auth/guard";
import { listTeamMembers } from "@/lib/team";
import { hashPassword, generateTemporaryPassword } from "@/lib/auth/password";
import { addTeamMemberSchema } from "@/lib/validation/team";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";
import { logAdminAction } from "@/lib/admin-action-log";

export async function GET() {
  let admin;
  try {
    admin = await requireTenantAdmin();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  const members = await listTeamMembers(admin.tenantId);
  return apiSuccess({ members });
}

// Direct creation, not invite-by-email — this codebase has no email
// infrastructure (no SMTP/SES env vars, no password-reset flow), and the
// spec doesn't detail how a second Admin/Tenant Member gets added. The
// temporary password is returned once, in this response, for the inviting
// Tenant Admin to share out-of-band; mustChangePassword forces a real
// change on first login.
export async function POST(request: NextRequest) {
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

  const parsed = addTeamMemberSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const existing = await prisma.admin.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return apiError("An account with this email already exists", 409, { email: ["Already in use"] });
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const member = await prisma.admin.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name || null,
        role: parsed.data.role,
        tenantId: admin.tenantId,
        passwordHash,
        mustChangePassword: true,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    await logAdminAction({
      tenantId: admin.tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "TEAM_MEMBER_ADDED",
      targetType: "Admin",
      targetId: member.id,
      detail: { email: member.email, role: member.role },
    });

    return apiSuccess({ member, temporaryPassword }, 201);
  } catch (error) {
    console.error("Adding team member failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
