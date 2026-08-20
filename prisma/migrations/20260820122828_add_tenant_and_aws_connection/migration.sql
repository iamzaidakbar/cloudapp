-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('NOT_CONNECTED', 'CONNECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "VerificationSource" AS ENUM ('AWS', 'DEV_ADAPTER');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aws_connections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleArn" TEXT,
    "externalId" TEXT NOT NULL,
    "awsAccountId" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "verificationSource" "VerificationSource",
    "lastVerifiedAt" TIMESTAMP(3),
    "lastVerificationError" TEXT,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aws_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aws_connections_tenantId_key" ON "aws_connections"("tenantId");

-- AddForeignKey
ALTER TABLE "aws_connections" ADD CONSTRAINT "aws_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
