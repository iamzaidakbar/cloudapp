import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { AdminRole } from "@/lib/generated/prisma/client";

// Deliberately widened, not cached: role/tenantId are re-read fresh from
// Postgres on every request (iron-session here is a stateless, unrevocable
// cookie — the only correct way for a demotion/removal to take effect is to
// never trust the cookie for anything beyond identity). This adds no new
// query; getCurrentAdmin() already did one DB round-trip per call.
export async function getCurrentAdmin() {
  const session = await getSession();
  if (!session.adminId) return null;

  return prisma.admin.findUnique({
    where: { id: session.adminId },
    select: { id: true, email: true, name: true, role: true, tenantId: true },
  });
}

export class AuthError extends Error {
  status: 401 | 403;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) throw new AuthError(401, "Unauthorized");
  return admin;
}

// Either tenant role (TENANT_ADMIN or TENANT_MEMBER) — narrows tenantId to
// non-null. Use for anything a Tenant Member may only view.
export async function requireTenantScope() {
  const admin = await requireAdmin();
  if (admin.role === "PLATFORM_OPERATOR" || !admin.tenantId) {
    throw new AuthError(403, "Forbidden");
  }
  return admin as typeof admin & { tenantId: string };
}

// Write access within a tenant — Tenant Admin only. Tenant Member is
// read-only per the spec ("read-only access to their tenant's audits and
// reports"), so every mutating route uses this, never requireTenantScope.
export async function requireTenantAdmin() {
  const admin = await requireTenantScope();
  if (admin.role !== "TENANT_ADMIN") throw new AuthError(403, "Forbidden");
  return admin;
}

export async function requirePlatformOperator() {
  const admin = await requireAdmin();
  if (admin.role !== "PLATFORM_OPERATOR") throw new AuthError(403, "Forbidden");
  return admin;
}

export type { AdminRole };
