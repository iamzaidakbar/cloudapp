import { withTenantContext } from "@/lib/db/with-tenant";
import { collectAwsInventory } from "@/lib/aws/audit/collect";
import { evaluateFindingsForResource } from "@/lib/aws/audit/findings";
import type { ServiceCollectionResult } from "@/lib/aws/audit/types";
import type { Prisma } from "@/lib/generated/prisma/client";

async function persistServiceResult(
  tenantId: string,
  auditRunId: string,
  result: ServiceCollectionResult,
) {
  await withTenantContext(tenantId, async (tx) => {
    await tx.auditServiceStatus.update({
      where: { auditRunId_service: { auditRunId, service: result.service } },
      data: {
        status: result.status,
        resourceCount: result.resourceCount,
        errorMessage: result.errorMessage,
        finishedAt: new Date(),
      },
    });

    for (const resource of result.resources) {
      const created = await tx.auditResource.create({
        data: {
          tenantId,
          auditRunId,
          service: resource.service,
          resourceId: resource.resourceId,
          name: resource.name,
          region: resource.region,
          status: resource.status,
          environment: resource.tags.Environment ?? resource.tags.environment ?? null,
          tags: resource.tags,
          rawConfig: resource.rawConfig as Prisma.InputJsonValue,
          monthlyCost: resource.monthlyCost,
          costAvailable: resource.costAvailable,
          cpuUtilizationAvgPercent: resource.cpuUtilizationAvgPercent,
        },
      });

      const draftFindings = evaluateFindingsForResource(resource);
      if (draftFindings.length > 0) {
        await tx.auditFinding.createMany({
          data: draftFindings.map((finding) => ({
            tenantId,
            auditRunId,
            resourceId: created.id,
            type: finding.type,
            severity: finding.severity,
            title: finding.title,
            description: finding.description,
            remediation: finding.remediation,
          })),
        });
      }
    }
  });
}

export async function runAudit(auditRunId: string, tenantId: string): Promise<void> {
  const now = new Date();

  const [connection, auditRun] = await withTenantContext(tenantId, (tx) =>
    Promise.all([
      tx.awsConnection.findUnique({ where: { tenantId } }),
      tx.auditRun.findUniqueOrThrow({ where: { id: auditRunId }, select: { version: true } }),
    ]),
  );

  if (!connection?.roleArn) {
    await withTenantContext(tenantId, (tx) =>
      tx.auditRun.update({
        where: { id: auditRunId },
        data: { status: "FAILED", startedAt: now, finishedAt: new Date(), errorMessage: "No AWS role connected." },
      }),
    );
    return;
  }

  await withTenantContext(tenantId, (tx) =>
    tx.auditRun.update({ where: { id: auditRunId }, data: { status: "RUNNING", startedAt: now } }),
  );
  await withTenantContext(tenantId, (tx) =>
    tx.auditServiceStatus.updateMany({ where: { auditRunId }, data: { startedAt: now } }),
  );

  try {
    const summary = await collectAwsInventory(
      connection.roleArn,
      connection.externalId,
      `cloudshiftg-audit-${auditRunId}`,
      `${tenantId}:${auditRun.version}`,
      (result) => persistServiceResult(tenantId, auditRunId, result),
    );

    const [resourceCount, findingCount, criticalFindingCount] = await withTenantContext(
      tenantId,
      async (tx) => [
        await tx.auditResource.count({ where: { auditRunId } }),
        await tx.auditFinding.count({ where: { auditRunId } }),
        await tx.auditFinding.count({ where: { auditRunId, severity: "CRITICAL" } }),
      ],
    );

    await withTenantContext(tenantId, (tx) =>
      tx.auditRun.update({
        where: { id: auditRunId },
        data: {
          status: "SUCCEEDED",
          finishedAt: new Date(),
          dataSource: summary.dataSource,
          resourceCount,
          findingCount,
          criticalFindingCount,
          estimatedMonthlyCost: summary.estimatedMonthlyCost,
          costDataAvailable: summary.estimatedMonthlyCost !== null,
          utilizationDataAvailable: summary.utilizationDataAvailable,
        },
      }),
    );
  } catch (error) {
    console.error(`Audit run ${auditRunId} failed before completion:`, error);
    const message = error instanceof Error ? error.message : "Audit failed unexpectedly.";

    await withTenantContext(tenantId, async (tx) => {
      await tx.auditServiceStatus.updateMany({
        where: { auditRunId, status: "PENDING" },
        data: { status: "SKIPPED", finishedAt: new Date() },
      });
      await tx.auditRun.update({
        where: { id: auditRunId },
        data: { status: "FAILED", finishedAt: new Date(), errorMessage: message.slice(0, 500) },
      });
    });
  }
}
