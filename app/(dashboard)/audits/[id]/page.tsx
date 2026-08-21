import { notFound } from "next/navigation";
import { requireTenantScope } from "@/lib/auth/guard";
import { getAuditRun } from "@/lib/audits";
import { AuditReportView } from "@/components/audits/audit-report-view";

export default async function AuditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireTenantScope();

  const auditRun = await getAuditRun(admin.tenantId, id);
  if (!auditRun) notFound();

  return <AuditReportView initialAuditRun={auditRun} />;
}
