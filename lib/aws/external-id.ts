import { randomBytes } from "node:crypto";

export function generateExternalId() {
  return randomBytes(16).toString("hex");
}
