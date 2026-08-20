import { withTenantContext } from "@/lib/db/with-tenant";
import { priceComparisonItems } from "@/lib/pricing/collect";
import { isAwsConfigured } from "@/lib/aws/is-configured";
import { assumeTenantRole, type AssumedRoleCredentials } from "@/lib/aws/sts";
import { COMPARABLE_SERVICE_TYPES } from "@/lib/pricing/types";
import type { ComparisonSourceItem, PricedComparisonItem } from "@/lib/pricing/types";

async function persistComparisonItem(tenantId: string, comparisonRunId: string, item: PricedComparisonItem) {
  await withTenantContext(tenantId, (tx) =>
    tx.comparisonItem.create({
      data: {
        tenantId,
        comparisonRunId,
        auditResourceId: item.auditResourceId,
        awsService: item.awsService,
        awsResourceId: item.awsResourceId,
        awsResourceName: item.awsResourceName,
        region: item.region,
        awsSizeLabel: item.awsSizeLabel,
        gcpService: item.gcpService,
        gcpSizeLabel: item.gcpSizeLabel,
        currentAwsMonthlyCost: item.currentAwsMonthlyCost,
        gcpLikeForLikeMonthlyCost: item.gcpLikeForLikeMonthlyCost,
        gcpOptimizedMonthlyCost: item.gcpOptimizedMonthlyCost,
        costAvailable: item.costAvailable,
        estimatedMigrationCost: item.estimatedMigrationCost,
        performanceNotes: item.performanceNotes,
      },
    }),
  );
}

export async function runComparison(comparisonRunId: string, tenantId: string): Promise<void> {
  const now = new Date();

  const [connection, comparisonRun] = await withTenantContext(tenantId, (tx) =>
    Promise.all([
      tx.awsConnection.findUnique({ where: { tenantId } }),
      tx.comparisonRun.findUniqueOrThrow({
        where: { id: comparisonRunId },
        select: { version: true, sourceAuditRunId: true },
      }),
    ]),
  );

  await withTenantContext(tenantId, (tx) =>
    tx.comparisonRun.update({ where: { id: comparisonRunId }, data: { status: "RUNNING", startedAt: now } }),
  );

  try {
    const [resources, ebsVolumes] = await withTenantContext(tenantId, (tx) =>
      Promise.all([
        tx.auditResource.findMany({
          where: { auditRunId: comparisonRun.sourceAuditRunId, service: { in: COMPARABLE_SERVICE_TYPES } },
        }),
        tx.auditResource.findMany({
          where: { auditRunId: comparisonRun.sourceAuditRunId, service: "EBS_VOLUME" },
        }),
      ]),
    );

    const ebsSizeByVolumeId = new Map<string, number>(
      ebsVolumes.map((v) => [v.resourceId, ((v.rawConfig as { Size?: number } | null)?.Size ?? 0)]),
    );

    const sourceItems: ComparisonSourceItem[] = resources.map((r) => {
      let attachedVolumeSizesGb: number[] = [];
      if (r.service === "EC2_INSTANCE") {
        const raw = r.rawConfig as { BlockDeviceMappings?: Array<{ Ebs?: { VolumeId?: string } }> } | null;
        const volumeIds = (raw?.BlockDeviceMappings ?? [])
          .map((m) => m.Ebs?.VolumeId)
          .filter((id): id is string => Boolean(id));
        attachedVolumeSizesGb = volumeIds
          .map((id) => ebsSizeByVolumeId.get(id) ?? 0)
          .filter((size) => size > 0);
      }
      return {
        auditResourceId: r.id,
        service: r.service,
        resourceId: r.resourceId,
        name: r.name,
        region: r.region,
        rawConfig: r.rawConfig,
        cpuUtilizationAvgPercent: r.cpuUtilizationAvgPercent,
        attachedVolumeSizesGb,
      };
    });

    let tenantCredentials: AssumedRoleCredentials | null = null;
    if (isAwsConfigured() && connection?.roleArn) {
      tenantCredentials = await assumeTenantRole(
        connection.roleArn,
        connection.externalId,
        `cloudshiftg-comparison-${comparisonRunId}`,
      );
    }

    const summary = await priceComparisonItems(
      sourceItems,
      tenantCredentials,
      `${tenantId}:${comparisonRun.version}`,
      (item) => persistComparisonItem(tenantId, comparisonRunId, item),
    );

    await withTenantContext(tenantId, (tx) =>
      tx.comparisonRun.update({
        where: { id: comparisonRunId },
        data: {
          status: "SUCCEEDED",
          finishedAt: new Date(),
          awsDataSource: summary.awsDataSource,
          gcpDataSource: summary.gcpDataSource,
          totalAwsMonthlyCost: summary.totalAwsMonthlyCost,
          totalGcpLikeForLikeCost: summary.totalGcpLikeForLikeCost,
          totalGcpOptimizedCost: summary.totalGcpOptimizedCost,
          costDataAvailable: summary.costDataAvailable,
        },
      }),
    );
  } catch (error) {
    console.error(`Comparison run ${comparisonRunId} failed before completion:`, error);
    const message = error instanceof Error ? error.message : "Comparison failed unexpectedly.";

    await withTenantContext(tenantId, (tx) =>
      tx.comparisonRun.update({
        where: { id: comparisonRunId },
        data: { status: "FAILED", finishedAt: new Date(), errorMessage: message.slice(0, 500) },
      }),
    );
  }
}
