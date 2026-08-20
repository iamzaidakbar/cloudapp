import { isAwsConfigured } from "@/lib/aws/is-configured";
import { verifyWithAws } from "@/lib/aws/sts";
import { verifyWithDevAdapter } from "@/lib/aws/dev-adapter";
import type { VerificationSource } from "@/lib/generated/prisma/client";

type VerifyResult = {
  accountId: string;
  identityArn: string;
  source: VerificationSource;
};

// The only entry point API routes should call for verification — routes must
// never import lib/aws/sts.ts or lib/aws/dev-adapter.ts directly, so the
// real-vs-simulated decision always lives in exactly one place.
export async function verifyAwsConnection(
  roleArn: string,
  externalId: string,
  sessionName: string,
): Promise<VerifyResult> {
  if (isAwsConfigured()) {
    const result = await verifyWithAws(roleArn, externalId, sessionName);
    return { ...result, source: "AWS" };
  }

  const result = await verifyWithDevAdapter(roleArn, externalId);
  return { ...result, source: "DEV_ADAPTER" };
}
