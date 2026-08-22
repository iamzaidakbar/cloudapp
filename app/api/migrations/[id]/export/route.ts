import { requireTenantScope } from "@/lib/auth/guard";
import { getMigrationPlan } from "@/lib/migrations";
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
    const plan = await getMigrationPlan(admin.tenantId, id);
    if (!plan) {
      return apiError("Migration plan not found", 404);
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
        "estimatedMigrationCost",
        "gcpResourceSelfLink",
        "provisionedAt",
        "transferredAt",
        "objectsTransferred",
        "bytesTransferred",
      ],
      plan.resources.map((r) => [
        r.awsService,
        r.awsResourceId,
        r.awsResourceName,
        r.region,
        r.awsSizeLabel,
        r.gcpService,
        r.gcpSizeLabel,
        r.estimatedMigrationCost,
        r.gcpResourceSelfLink,
        r.provisionedAt?.toISOString() ?? "",
        r.transferredAt?.toISOString() ?? "",
        r.objectsTransferred,
        r.bytesTransferred == null ? "" : String(r.bytesTransferred),
      ]),
    );

    return csvResponse(`migration-${plan.sequenceNumber}-resources.csv`, csv);
  } catch (error) {
    console.error("Exporting migration resources failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
