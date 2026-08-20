import {
  STSClient,
  AssumeRoleCommand,
  GetCallerIdentityCommand,
} from "@aws-sdk/client-sts";
import { env } from "@/lib/env";
import { isAwsConfigured } from "@/lib/aws/is-configured";

const region = () => env.AWS_REGION ?? "us-east-1";

export async function verifyWithAws(roleArn: string, externalId: string, sessionName: string) {
  const client = new STSClient({ region: region() });

  const assumed = await client.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      ExternalId: externalId,
      RoleSessionName: sessionName.slice(0, 64),
      DurationSeconds: 900,
    }),
  );

  const creds = assumed.Credentials;
  if (!creds?.AccessKeyId || !creds.SecretAccessKey || !creds.SessionToken) {
    throw new Error("AWS did not return usable temporary credentials.");
  }

  const assumedClient = new STSClient({
    region: region(),
    credentials: {
      accessKeyId: creds.AccessKeyId,
      secretAccessKey: creds.SecretAccessKey,
      sessionToken: creds.SessionToken,
    },
  });

  const identity = await assumedClient.send(new GetCallerIdentityCommand({}));
  if (!identity.Account || !identity.Arn) {
    throw new Error("AWS did not return a caller identity for the assumed role.");
  }

  return { accountId: identity.Account, identityArn: identity.Arn };
}

// The app's own (non-assumed) AWS identity — shown to the Admin so they know
// which Principal to trust in their IAM role's trust policy. Returns null
// when the app has no AWS credentials configured (dev mode).
export async function getAppAwsIdentity() {
  if (!isAwsConfigured()) return null;

  const client = new STSClient({ region: region() });
  const identity = await client.send(new GetCallerIdentityCommand({}));
  if (!identity.Account || !identity.Arn) return null;

  return { accountId: identity.Account, arn: identity.Arn };
}
