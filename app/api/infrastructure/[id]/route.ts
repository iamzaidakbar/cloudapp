import { requireTenantScope } from "@/lib/auth/guard";
import { getInfrastructureResource } from "@/lib/infrastructure";
import { apiError, apiErrorFromAuth, apiSuccess } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireTenantScope();
  } catch (error) {
    return apiErrorFromAuth(error);
  }

  try {
    const { id } = await params;
    const resource = await getInfrastructureResource(admin.tenantId, id);
    if (!resource) {
      return apiError("Resource not found", 404);
    }

    return apiSuccess({ resource });
  } catch (error) {
    console.error("Fetching resource failed:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
