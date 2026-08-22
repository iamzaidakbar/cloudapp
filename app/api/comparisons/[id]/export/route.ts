import { requireTenantScope } from "@/lib/auth/guard";
import { getComparisonRun } from "@/lib/comparisons";
import { csvResponse, rowsToCsv } from "@/lib/csv";
import { apiError, apiErrorFromAuth } from "@/lib/api/response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let admin;
  try {
    admin = await requireTenantScope();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { id } = await params;
    const comparisonRun = await getComparisonRun(admin.tenantId, id);
    if (!comparisonRun) {
      return apiError("Comparison run not found", 404);
    }

    const csv = rowsToCsv(
      [
        "awsService",
        "awsResourceId",
        "awsResourceName",
        "region",
        "awsSizeLabel",
        "gcpService",
        "gcpSizeLabel",
        "currentAwsMonthlyCost",
        "gcpLikeForLikeMonthlyCost",
        "gcpOptimizedMonthlyCost",
        "estimatedMigrationCost",
        "costAvailable",
      ],
      comparisonRun.items.map((item) => [
        item.awsService,
        item.awsResourceId,
        item.awsResourceName,
        item.region,
        item.awsSizeLabel,
        item.gcpService,
        item.gcpSizeLabel,
        item.currentAwsMonthlyCost,
        item.gcpLikeForLikeMonthlyCost,
        item.gcpOptimizedMonthlyCost,
        item.estimatedMigrationCost,
        item.costAvailable,
      ]),
    );

    return csvResponse(`comparison-${comparisonRun.version}-items.csv`, csv);
  } catch (error) {
    console.error("Exporting comparison items failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
