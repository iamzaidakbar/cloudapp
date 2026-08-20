import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return apiSuccess({ status: "ready", db: "connected" });
  } catch (error) {
    console.error("Readiness check failed:", error);
    return apiError("Database is not reachable", 503);
  }
}
