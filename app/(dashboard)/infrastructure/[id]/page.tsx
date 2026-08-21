import { notFound } from "next/navigation";
import { requireTenantScope } from "@/lib/auth/guard";
import { getInfrastructureResource } from "@/lib/infrastructure";
import { ResourceIdentityHeader } from "@/components/infrastructure/resource-identity-header";
import { ResourceDetailTabs } from "@/components/infrastructure/resource-detail-tabs";

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireTenantScope();

  const resource = await getInfrastructureResource(admin.tenantId, id);
  if (!resource) notFound();

  return (
    <div className="flex flex-col gap-5">
      <ResourceIdentityHeader
        service={resource.service}
        name={resource.name}
        resourceId={resource.resourceId}
        region={resource.region}
        status={resource.status}
        environment={resource.environment}
        dataSource={resource.auditRun.dataSource}
      />
      <ResourceDetailTabs
        tags={resource.tags as Record<string, string>}
        monthlyCost={resource.monthlyCost}
        costAvailable={resource.costAvailable}
        cpuUtilizationAvgPercent={resource.cpuUtilizationAvgPercent}
        findings={resource.findings.map((f) => ({ ...f, resource: null }))}
        rawConfig={resource.rawConfig}
        auditRunId={resource.auditRunId}
        auditRunVersion={resource.auditRun.version}
        collectedAt={resource.createdAt}
      />
    </div>
  );
}
