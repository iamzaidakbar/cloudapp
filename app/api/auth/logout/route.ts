import { getSession } from "@/lib/auth/session";
import { apiSuccess } from "@/lib/api/response";

export async function POST() {
  const session = await getSession();
  session.destroy();
  return apiSuccess({});
}
