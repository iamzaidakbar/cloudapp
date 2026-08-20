import { withTenantContext } from "@/lib/db/with-tenant";
import type { TerraformSourceResource } from "@/lib/terraform/generate";

function normalizeEngine(engine: string | undefined): "mysql" | "postgres" | null {
  if (engine === "mysql") return "mysql";
  if (engine === "postgres") return "postgres";
  return null;
}

// MigrationResource/ComparisonItem don't persist the RDS engine as its own
// column (see the Comparison phase's design) — recovered here via the same
// plain-string-reference lineage chain those tables already use:
// MigrationResource.comparisonItemId -> ComparisonItem.auditResourceId ->
// AuditResource.rawConfig.Engine, the real value AWS returned.
export async function getTerraformSourceResources(
  tenantId: string,
  migrationPlanId: string,
): Promise<TerraformSourceResource[]> {
  const resources = await withTenantContext(tenantId, (tx) =>
    tx.migrationResource.findMany({ where: { tenantId, migrationPlanId } }),
  );

  const rdsComparisonItemIds = resources.filter((r) => r.awsService === "RDS_INSTANCE").map((r) => r.comparisonItemId);
  const engineByComparisonItemId = new Map<string, "mysql" | "postgres" | null>();

  if (rdsComparisonItemIds.length > 0) {
    const comparisonItems = await withTenantContext(tenantId, (tx) =>
      tx.comparisonItem.findMany({
        where: { tenantId, id: { in: rdsComparisonItemIds } },
        select: { id: true, auditResourceId: true },
      }),
    );
    const auditResourceIds = comparisonItems.map((item) => item.auditResourceId);
    const auditResources = await withTenantContext(tenantId, (tx) =>
      tx.auditResource.findMany({ where: { tenantId, id: { in: auditResourceIds } }, select: { id: true, rawConfig: true } }),
    );
    const engineByAuditResourceId = new Map(
      auditResources.map((resource) => [
        resource.id,
        normalizeEngine((resource.rawConfig as { Engine?: string } | null)?.Engine),
      ]),
    );
    for (const item of comparisonItems) {
      engineByComparisonItemId.set(item.id, engineByAuditResourceId.get(item.auditResourceId) ?? null);
    }
  }

  return resources.map((resource) => ({
    awsService: resource.awsService,
    awsResourceId: resource.awsResourceId,
    awsResourceName: resource.awsResourceName,
    region: resource.region,
    awsSizeLabel: resource.awsSizeLabel,
    gcpSizeLabel: resource.gcpSizeLabel,
    rdsEngine: resource.awsService === "RDS_INSTANCE" ? engineByComparisonItemId.get(resource.comparisonItemId) ?? null : null,
  }));
}

export async function getNextTerraformRunVersion(tenantId: string, migrationPlanId: string): Promise<number> {
  const latest = await withTenantContext(tenantId, (tx) =>
    tx.terraformRun.findFirst({ where: { tenantId, migrationPlanId }, orderBy: { version: "desc" }, select: { version: true } }),
  );
  return (latest?.version ?? 0) + 1;
}

export async function getActiveTerraformRun(tenantId: string, migrationPlanId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.terraformRun.findFirst({
      where: { tenantId, migrationPlanId, status: { in: ["QUEUED", "RUNNING"] } },
      orderBy: { version: "desc" },
    }),
  );
}

export async function getLatestTerraformRun(tenantId: string, migrationPlanId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx.terraformRun.findFirst({ where: { tenantId, migrationPlanId }, orderBy: { version: "desc" } }),
  );
}

export async function getTerraformRun(tenantId: string, id: string) {
  return withTenantContext(tenantId, (tx) => tx.terraformRun.findFirst({ where: { id, tenantId } }));
}

export async function createTerraformRun(tenantId: string, migrationPlanId: string, terraformConfig: string) {
  const version = await getNextTerraformRunVersion(tenantId, migrationPlanId);
  return withTenantContext(tenantId, (tx) =>
    tx.terraformRun.create({ data: { tenantId, migrationPlanId, version, terraformConfig } }),
  );
}
