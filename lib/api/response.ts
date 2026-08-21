import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/guard";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: string;
  fieldErrors?: Record<string, string[]>;
};

export function apiSuccess<T>(data: T, init?: number | ResponseInit) {
  const body: ApiSuccess<T> = { success: true, data };
  return NextResponse.json(body, typeof init === "number" ? { status: init } : init);
}

export function apiError(
  error: string,
  status = 400,
  fieldErrors?: Record<string, string[]>,
) {
  const body: ApiError = { success: false, error, ...(fieldErrors ? { fieldErrors } : {}) };
  return NextResponse.json(body, { status });
}

// Maps an AuthError to its real status (401 unauthenticated vs 403
// forbidden-by-role) instead of every route hardcoding 401 in a bare catch.
export function apiErrorFromAuth(error: unknown) {
  if (error instanceof AuthError) return apiError(error.message, error.status);
  return apiError("Unauthorized", 401);
}
