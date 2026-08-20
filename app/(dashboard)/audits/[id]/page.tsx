import { notFound } from "next/navigation";
import { getTenantWithConnection } from "@/lib/tenant";
import { getAuditRun } from "@/lib/audits";
import { AuditReportView } from "@/components/audits/audit-report-view";

export default async function AuditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await getTenantWithConnection();
  if (!tenant) notFound();

  const auditRun = await getAuditRun(tenant.id, id);
  if (!auditRun) notFound();

  return <AuditReportView initialAuditRun={auditRun} />;
}
