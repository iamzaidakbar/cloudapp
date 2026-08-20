import { env } from "@/lib/env";

export function isAwsConfigured() {
  return Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);
}
