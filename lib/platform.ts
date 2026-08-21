import { prisma } from "@/lib/db";
import { withTenantContext } from "@/lib/db/with-tenant";

// The one place the Platform Operator's cross-tenant tenant list is
// queried. Tenant itself isn't RLS'd, so the top-level list is a plain
// unscoped read — but AwsConnection IS RLS'd (FORCE ROW LEVEL SECURITY), so
// a naive `include: { awsConnection: {...} }` on the unscoped query above
// would always come back null for every tenant, no matter what's really
// there — confirmed the hard way against the real database (Tenant 1's
// genuinely CONNECTED AwsConnection came back null this way). Each tenant's
// connection is looked up separately, correctly scoped via
// withTenantContext, and never selects roleArn/externalId: "must not have
// access to tenant cloud credentials" is enforced here by construction —
// this select simply never touches those columns.
export async function listTenantsForOperator() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, createdAt: true, _count: { select: { admins: true } } },
    orderBy: { createdAt: "asc" },
  });

  return Promise.all(
    tenants.map(async (tenant) => {
      const awsConnection = await withTenantContext(tenant.id, (tx) =>
        tx.awsConnection.findUnique({
          where: { tenantId: tenant.id },
          select: { status: true, awsAccountId: true, lastVerifiedAt: true, connectedAt: true },
        }),
      );
      return { ...tenant, awsConnection };
    }),
  );
}
