export type RdsCredential = {
  migrationResourceId: string;
  username?: string;
  password: string;
};

const ENV_KEY = "TRANSFER_RDS_CREDENTIALS";

/** Load short-lived RDS credentials from the Job env (K8s Secret or inline). */
export function loadRdsCredentialsFromEnv(): RdsCredential[] {
  const raw = process.env[ENV_KEY]?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RdsCredential =>
          Boolean(
            item &&
              typeof item === "object" &&
              typeof (item as RdsCredential).migrationResourceId === "string" &&
              typeof (item as RdsCredential).password === "string" &&
              (item as RdsCredential).password.length > 0,
          ),
      )
      .map((item) => ({
        migrationResourceId: item.migrationResourceId,
        password: item.password,
        ...(typeof item.username === "string" && item.username.trim()
          ? { username: item.username.trim() }
          : {}),
      }));
  } catch {
    throw new Error("TRANSFER_RDS_CREDENTIALS is not valid JSON");
  }
}

export function credentialForResource(
  credentials: RdsCredential[],
  migrationResourceId: string,
): RdsCredential | undefined {
  return credentials.find((c) => c.migrationResourceId === migrationResourceId);
}

export { ENV_KEY as TRANSFER_RDS_CREDENTIALS_ENV };
