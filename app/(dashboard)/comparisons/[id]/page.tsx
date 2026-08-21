import { notFound } from "next/navigation";
import { requireTenantScope } from "@/lib/auth/guard";
import { getComparisonRun } from "@/lib/comparisons";
import { ComparisonReportView } from "@/components/comparisons/comparison-report-view";

export default async function ComparisonReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireTenantScope();

  const comparisonRun = await getComparisonRun(admin.tenantId, id);
  if (!comparisonRun) notFound();

  return <ComparisonReportView initialComparisonRun={comparisonRun} />;
}
