import { createHash } from "node:crypto";

// Simulated AWS verification for local development when the app has no AWS
// credentials configured. Never makes a network call. Clearly separate from
// the real integration in lib/aws/sts.ts — callers must record which path
// produced a result (see lib/aws/verify-connection.ts) so the UI can never
// present a simulated connection as a real one.
export async function verifyWithDevAdapter(roleArn: string, externalId: string) {
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (roleArn.toLowerCase().includes("fail")) {
    throw new Error(
      "Simulated STS AssumeRole failure (dev adapter): the trust policy rejected the request.",
    );
  }

  const digest = createHash("sha256").update(`${roleArn}:${externalId}`).digest("hex");
  const accountId = digest.replace(/\D/g, "").padEnd(12, "0").slice(0, 12);

  return {
    accountId,
    identityArn: `arn:aws:sts::${accountId}:assumed-role/dev-adapter-simulated/${externalId.slice(0, 8)}`,
  };
}
