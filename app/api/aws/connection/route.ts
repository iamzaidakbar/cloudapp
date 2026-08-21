import { NextRequest } from "next/server";
import { requireTenantAdmin, requireTenantScope } from "@/lib/auth/guard";
import { getTenantWithConnection } from "@/lib/tenant";
import { withTenantContext } from "@/lib/db/with-tenant";
import { getAppAwsIdentity } from "@/lib/aws/sts";
import { roleArnSchema } from "@/lib/validation/aws-connection";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";
import { logAdminAction } from "@/lib/admin-action-log";

export async function GET() {
  let admin;
  try {
    admin = await requireTenantScope();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { tenant, connection } = await getTenantWithConnection(admin.tenantId);
    const appIdentity = await getAppAwsIdentity();
    return apiSuccess({ tenant, connection, appIdentity });
  } catch (error) {
    console.error("Fetching AWS connection failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  let admin;
  try {
    admin = await requireTenantAdmin();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  const parsed = roleArnSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const connection = await withTenantContext(admin.tenantId, (tx) =>
      tx.awsConnection.update({
        where: { tenantId: admin.tenantId },
        data: {
          roleArn: parsed.data.roleArn,
          status: "NOT_CONNECTED",
          awsAccountId: null,
          verificationSource: null,
          lastVerificationError: null,
        },
      }),
    );

    await logAdminAction({
      tenantId: admin.tenantId,
      adminId: admin.id,
      adminEmail: admin.email,
      action: "AWS_CONNECTION_UPDATED",
      targetType: "AwsConnection",
      targetId: connection.id,
      detail: { roleArn: parsed.data.roleArn },
    });

    return apiSuccess({ connection });
  } catch (error) {
    console.error("Updating AWS connection failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
