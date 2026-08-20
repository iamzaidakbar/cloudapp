import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth/session";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/settings",
  "/infrastructure",
  "/audits",
  "/comparisons",
  "/migrations",
];

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/settings/:path*",
    "/infrastructure/:path*",
    "/audits/:path*",
    "/comparisons/:path*",
    "/migrations/:path*",
    "/login",
  ],
};

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  const isAuthed = Boolean(session.adminId);

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (!isAuthed && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthed && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
