import { NextResponse } from "next/server";

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
