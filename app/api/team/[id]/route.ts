import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantAdmin } from "@/lib/auth/guard";
import {
  teamMemberDeleteBlockReason,
  teamMemberRoleChangeBlockReason,
} from "@/lib/team";
import { updateTeamMemberRoleSchema } from "@/lib/validation/team";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";
import { logAdminAction } from "@/lib/admin-action-log";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  let admin;
  try {
    admin = await requireTenantAdmin();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  const parsed = updateTeamMemberRoleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const target = await prisma.admin.findFirst({
      where: { id, tenantId: admin.tenantId },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!target) {
      return apiError("Team member not found", 404);
    }

    const tenantAdminCount = await prisma.admin.count({
      where: { tenantId: admin.tenantId, role: "TENANT_ADMIN" },
    });

    const block = teamMemberRoleChangeBlockReason({
      actorId: admin.id,
      targetId: target.id,
      targetEmail: target.email,
      currentRole: target.role,
      nextRole: parsed.data.role,
      tenantAdminCount,
    });
    if (block) {
      return apiError(block, 403);
    }

    const updated = await prisma.admin.update({
      where: { id: target.id },
      data: { role: parsed.data.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    await logAdminAction({
      tenantId: admin.tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "TEAM_MEMBER_ROLE_CHANGED",
      targetType: "Admin",
      targetId: target.id,
      detail: {
        email: target.email,
        fromRole: target.role,
        toRole: parsed.data.role,
      },
    });

    return apiSuccess({ member: updated });
  } catch (error) {
    console.error("Updating team member role failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  let admin;
  try {
    admin = await requireTenantAdmin();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  const { id } = await context.params;

  try {
    const target = await prisma.admin.findFirst({
      where: { id, tenantId: admin.tenantId },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!target) {
      return apiError("Team member not found", 404);
    }

    const block = teamMemberDeleteBlockReason({
      actorId: admin.id,
      targetId: target.id,
      targetEmail: target.email,
    });
    if (block) {
      return apiError(block, 403);
    }

    await prisma.admin.delete({ where: { id: target.id } });

    await logAdminAction({
      tenantId: admin.tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "TEAM_MEMBER_REMOVED",
      targetType: "Admin",
      targetId: target.id,
      detail: { email: target.email, role: target.role },
    });

    return apiSuccess({ deleted: { id: target.id, email: target.email } });
  } catch (error) {
    console.error("Removing team member failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
