import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function getCurrentAdmin() {
  const session = await getSession();
  if (!session.adminId) return null;

  return prisma.admin.findUnique({
    where: { id: session.adminId },
    select: { id: true, email: true, name: true },
  });
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("UNAUTHORIZED");
  return admin;
}
