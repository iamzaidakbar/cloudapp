import { getSession } from "@/lib/auth/session";
import { apiSuccess } from "@/lib/api/response";
import { logAdminAction } from "@/lib/admin-action-log";

export async function POST() {
  const session = await getSession();
  if (session.adminId && session.email) {
    await logAdminAction({ adminId: session.adminId, adminEmail: session.email, action: "LOGOUT" });
  }
  session.destroy();
  return apiSuccess({});
}
