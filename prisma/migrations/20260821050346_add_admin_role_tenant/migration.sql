-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('PLATFORM_OPERATOR', 'TENANT_ADMIN', 'TENANT_MEMBER');

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "AdminRole" NOT NULL DEFAULT 'TENANT_ADMIN',
ADD COLUMN     "tenantId" TEXT;

-- CreateIndex
CREATE INDEX "admins_tenantId_idx" ON "admins"("tenantId");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
