import { requirePlatformOperator } from "@/lib/auth/guard";
import { listTenantsForOperator } from "@/lib/platform";
import { apiErrorFromAuth, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    await requirePlatformOperator();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  const tenants = await listTenantsForOperator();
  return apiSuccess({ tenants });
}
