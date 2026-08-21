import { requireTenantAdmin } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { withTenantContext } from "@/lib/db/with-tenant";
import { verifyAwsConnection } from "@/lib/aws/verify-connection";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";
import { logAdminAction } from "@/lib/admin-action-log";

export async function POST() {
  let admin;
  try {
    admin = await requireTenantAdmin();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { connection } = await getTenantWithConnection(admin.tenantId);
    if (!connection) {
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
        `cloudshiftg-${admin.tenantId}`,
      );

      const updated = await withTenantContext(admin.tenantId, (tx) =>
        tx.awsConnection.update({
          where: { tenantId: admin.tenantId },
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

      await logAdminAction({
        tenantId: admin.tenantId,
        adminId: admin.id,
        adminEmail: admin.email,
        action: "AWS_CONNECTION_VERIFIED",
        targetType: "AwsConnection",
        targetId: connection.id,
        detail: { status: "CONNECTED", awsAccountId: result.accountId },
      });

      return apiSuccess({ connection: updated, verified: true });
    } catch (verifyError) {
      const message =
        verifyError instanceof Error ? verifyError.message : "Verification failed";

      const updated = await withTenantContext(admin.tenantId, (tx) =>
        tx.awsConnection.update({
          where: { tenantId: admin.tenantId },
          data: {
            status: "FAILED",
            lastVerifiedAt: now,
            lastVerificationError: message.slice(0, 500),
          },
        }),
      );

      await logAdminAction({
        tenantId: admin.tenantId,
        adminId: admin.id,
        adminEmail: admin.email,
        action: "AWS_CONNECTION_VERIFIED",
        targetType: "AwsConnection",
        targetId: connection.id,
        detail: { status: "FAILED", error: message.slice(0, 300) },
      });

      return apiSuccess({ connection: updated, verified: false });
    }
  } catch (error) {
    console.error("AWS connection verification failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
