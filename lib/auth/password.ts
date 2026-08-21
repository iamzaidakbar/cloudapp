import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const SALT_ROUNDS = 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

// For POST /api/team: this codebase has no email infrastructure, so a
// Tenant Admin creating a teammate's account is handed this once, in the
// API response, to share out-of-band — never logged or stored in plaintext.
// mustChangePassword forces a real change on first login.
export function generateTemporaryPassword() {
  return randomBytes(12).toString("base64url");
}
