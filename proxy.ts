import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth/session";

// /onboarding is deliberately NOT here — step 1 of the wizard is public
// self-service registration (creates the very first session), so it can't
// require one to already exist. Steps 2/3 are gated inside the page/layout
// itself once a session exists, same as everywhere else in this app.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/settings",
  "/infrastructure",
  "/audits",
  "/comparisons",
  "/migrations",
  "/jobs",
  "/audit-log",
  "/platform",
];

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/infrastructure/:path*",
    "/audits/:path*",
    "/comparisons/:path*",
    "/migrations/:path*",
    "/jobs/:path*",
    "/audit-log/:path*",
    "/platform/:path*",
    "/login",
  ],
};

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  const isAuthed = Boolean(session.adminId);

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (!isAuthed && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthed && request.nextUrl.pathname === "/login") {
    const home =
      session.role === "PLATFORM_OPERATOR" ? "/platform" : "/dashboard";
    return NextResponse.redirect(new URL(home, request.url));
  }

  return response;
}
