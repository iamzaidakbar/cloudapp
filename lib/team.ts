import { prisma } from "@/lib/db";

// admins is deliberately not RLS'd (same treatment as PricingCache) — login
// has to look an admin up by email before any tenant context can exist, so
// a strict per-tenant RLS policy on this table would be self-defeating.
// Every query here filters by tenantId explicitly instead; that filter is
// the real protection, same discipline this codebase already applies
// everywhere RLS isn't the backstop.
export async function listTeamMembers(tenantId: string) {
  return prisma.admin.findMany({
    where: { tenantId },
    select: { id: true, email: true, name: true, role: true, mustChangePassword: true, lastLoginAt: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export {
  isProtectedTeamEmail,
  teamMemberDeleteBlockReason,
  teamMemberRoleChangeBlockReason,
} from "@/lib/team-shared";
