import { requireAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { withTenantContext } from "@/lib/db/with-tenant";
import { verifyAwsConnection } from "@/lib/aws/verify-connection";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return apiError("Unauthorized", 401);
  }

  try {
    const { tenant, connection } = await getTenantWithConnection();
    if (!tenant || !connection) {
      return apiError("Organization not configured", 404);
    }
    if (!connection.roleArn) {
      return apiError("Enter a role ARN before verifying", 400);
    }

    const now = new Date();

    try {
      const result = await verifyAwsConnection(
        connection.roleArn,
        connection.externalId,
        `cloudshiftg-${tenant.id}`,
      );

      const updated = await withTenantContext(tenant.id, (tx) =>
        tx.awsConnection.update({
          where: { tenantId: tenant.id },
          data: {
            status: "CONNECTED",
            awsAccountId: result.accountId,
            verificationSource: result.source,
            lastVerifiedAt: now,
            connectedAt: connection.connectedAt ?? now,
            lastVerificationError: null,
          },
        }),
      );

      return apiSuccess({ connection: updated, verified: true });
    } catch (verifyError) {
      const message =
        verifyError instanceof Error ? verifyError.message : "Verification failed";

      const updated = await withTenantContext(tenant.id, (tx) =>
        tx.awsConnection.update({
          where: { tenantId: tenant.id },
          data: {
            status: "FAILED",
            lastVerifiedAt: now,
            lastVerificationError: message.slice(0, 500),
          },
        }),
      );

      return apiSuccess({ connection: updated, verified: false });
    }
  } catch (error) {
    console.error("AWS connection verification failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
