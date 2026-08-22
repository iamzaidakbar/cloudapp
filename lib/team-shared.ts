import { PROTECTED_TENANT_ADMIN_EMAIL } from "@/lib/constants";

export type TenantAssignableRole = "TENANT_ADMIN" | "TENANT_MEMBER";

export function isProtectedTeamEmail(email: string) {
  return email.trim().toLowerCase() === PROTECTED_TENANT_ADMIN_EMAIL;
}

/** Why a Tenant Admin may not delete this member, or null if delete is allowed. */
export function teamMemberDeleteBlockReason(options: {
  actorId: string;
  targetId: string;
  targetEmail: string;
}): string | null {
  if (options.targetId === options.actorId) {
    return "You cannot delete your own account";
  }
  if (isProtectedTeamEmail(options.targetEmail)) {
    return `${PROTECTED_TENANT_ADMIN_EMAIL} cannot be deleted`;
  }
  return null;
}

/** Why a role change is blocked, or null if allowed. */
export function teamMemberRoleChangeBlockReason(options: {
  actorId: string;
  targetId: string;
  targetEmail: string;
  currentRole: string;
  nextRole: TenantAssignableRole;
  tenantAdminCount: number;
}): string | null {
  if (options.targetId === options.actorId) {
    return "You cannot change your own role";
  }
  if (isProtectedTeamEmail(options.targetEmail)) {
    return `${PROTECTED_TENANT_ADMIN_EMAIL} role cannot be changed`;
  }
  if (options.currentRole === options.nextRole) {
    return "Role is already set";
  }
  if (
    options.currentRole !== "TENANT_ADMIN" &&
    options.currentRole !== "TENANT_MEMBER"
  ) {
    return "Only Tenant Admin and Member roles can be changed";
  }
  if (
    options.currentRole === "TENANT_ADMIN" &&
    options.nextRole === "TENANT_MEMBER" &&
    options.tenantAdminCount <= 1
  ) {
    return "Cannot demote the last Tenant Admin";
  }
  return null;
}
