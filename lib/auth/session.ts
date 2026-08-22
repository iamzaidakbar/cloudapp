import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export interface SessionData {
  adminId?: string;
  email?: string;
  /** Stashed at login for proxy-friendly redirects; guards still re-read role from DB. */
  role?: string;
}

export const sessionOptions: SessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: "cloudshiftg_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
