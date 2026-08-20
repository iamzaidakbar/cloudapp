import {
  STSClient,
  AssumeRoleCommand,
  GetCallerIdentityCommand,
} from "@aws-sdk/client-sts";
import { env } from "@/lib/env";
import { isAwsConfigured } from "@/lib/aws/is-configured";

export const region = () => env.AWS_REGION ?? "us-east-1";

export type AssumedRoleCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
};

// Assumes the tenant's IAM role and returns short-lived credentials. Callers
// must keep these in a local variable only — never module-level/global,
// never logged, never persisted to the database.
export async function assumeTenantRole(
  roleArn: string,
  externalId: string,
  sessionName: string,
): Promise<AssumedRoleCredentials> {
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
  if (!creds?.AccessKeyId || !creds.SecretAccessKey || !creds.SessionToken || !creds.Expiration) {
    throw new Error("AWS did not return usable temporary credentials.");
  }

  return {
    accessKeyId: creds.AccessKeyId,
    secretAccessKey: creds.SecretAccessKey,
    sessionToken: creds.SessionToken,
    expiration: creds.Expiration,
  };
}

export async function verifyWithAws(roleArn: string, externalId: string, sessionName: string) {
  const creds = await assumeTenantRole(roleArn, externalId, sessionName);

  const assumedClient = new STSClient({
    region: region(),
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
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
