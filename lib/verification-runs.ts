import { withTenantContext } from "@/lib/db/with-tenant";
import { verifyResource } from "@/lib/gcp/verify";

export async function getNextVerificationRunVersion(tenantId: string, migrationPlanId: string): Promise<number> {
  const latest = await withTenantContext(tenantId, (tx) =>
    tx.verificationRun.findFirst({ where: { tenantId, migrationPlanId }, orderBy: { version: "desc" }, select: { version: true } }),
  );
  return (latest?.version ?? 0) + 1;
}

export async function getLatestVerificationRun(tenantId: string, migrationPlanId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.verificationRun.findFirst({
      where: { tenantId, migrationPlanId },
      orderBy: { version: "desc" },
      include: { checks: { include: { migrationResource: true } } },
    }),
  );
}

// Synchronous by design (see prisma/schema.prisma's VerificationRun comment)
// — runs every check and persists the completed result in one call, no
// QUEUED/RUNNING lifecycle needed for work this fast.
export async function createVerificationRun(tenantId: string, migrationPlanId: string) {
  const resources = await withTenantContext(tenantId, (tx) =>
    tx.migrationResource.findMany({ where: { tenantId, migrationPlanId } }),
  );

  const outcomes = await Promise.all(
    resources.map(async (resource) => ({
      resource,
      outcome: await verifyResource(resource.awsService, resource.gcpResourceSelfLink),
    })),
  );

  const version = await getNextVerificationRunVersion(tenantId, migrationPlanId);

  return withTenantContext(tenantId, (tx) =>
    tx.verificationRun.create({
      data: {
        tenantId,
        migrationPlanId,
        version,
        checks: {
          create: outcomes.map(({ resource, outcome }) => ({
            tenantId,
            migrationResourceId: resource.id,
            status: outcome.status,
            detail: outcome.detail,
            checkedRef: outcome.checkedRef,
          })),
        },
      },
      include: { checks: { include: { migrationResource: true } } },
    }),
  );
}
