import { notFound } from "next/navigation";
import { getTenantWithConnection } from "@/lib/tenant";
import { getComparisonRun } from "@/lib/comparisons";
import { ComparisonReportView } from "@/components/comparisons/comparison-report-view";

export default async function ComparisonReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenant } = await getTenantWithConnection();
  if (!tenant) notFound();

  const comparisonRun = await getComparisonRun(tenant.id, id);
  if (!comparisonRun) notFound();

  return <ComparisonReportView initialComparisonRun={comparisonRun} />;
}
