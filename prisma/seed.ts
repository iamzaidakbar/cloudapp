import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { hashPassword } from "../lib/auth/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Seeds only the Platform Operator — the one role that can never self-register
// (they have no tenant to register). Tenant Admins are created going forward
// via the self-service registration flow (POST /api/auth/register), not here.
async function main() {
  const email = process.env.PLATFORM_OPERATOR_EMAIL;
  const password = process.env.PLATFORM_OPERATOR_PASSWORD;
  const name = process.env.PLATFORM_OPERATOR_NAME;

  if (!email || !password) {
    throw new Error(
      "PLATFORM_OPERATOR_EMAIL and PLATFORM_OPERATOR_PASSWORD must be set in .env to seed the platform operator.",
    );
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash, name: name ?? undefined, role: "PLATFORM_OPERATOR", tenantId: null },
    create: { email, passwordHash, name, role: "PLATFORM_OPERATOR" },
  });

  console.log(`Seeded platform operator: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
