import type { AdminRole } from "@/lib/generated/prisma/client";

export function homePathForRole(role: AdminRole | string) {
  return role === "PLATFORM_OPERATOR" ? "/platform" : "/dashboard";
}

export function roleLabel(role: AdminRole | string) {
  switch (role) {
    case "PLATFORM_OPERATOR":
      return "Platform Operator";
    case "TENANT_ADMIN":
      return "Tenant Admin";
    case "TENANT_MEMBER":
      return "Member";
    default:
      return role;
  }
}
