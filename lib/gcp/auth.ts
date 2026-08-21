import { GoogleAuth } from "google-auth-library";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// Prefer Application Default Credentials (Workload Identity on GKE / Cloud Run,
// ADC from `gcloud auth application-default login` locally). Fall back to the
// gcloud CLI only when the library cannot resolve credentials (local without
// GOOGLE_APPLICATION_CREDENTIALS / metadata server).
let cachedToken: { value: string; expiresAt: number } | null = null;
const TOKEN_TTL_MS = 50 * 60 * 1000;
let authClient: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (!authClient) {
    authClient = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
  }
  return authClient;
}

async function tokenFromLibrary(): Promise<string | null> {
  try {
    const client = await getAuth().getClient();
    const access = await client.getAccessToken();
    const token = typeof access === "string" ? access : access?.token;
    return token?.trim() || null;
  } catch {
    return null;
  }
}

async function tokenFromGcloudCli(): Promise<string> {
  const { stdout } = await execAsync("gcloud auth application-default print-access-token");
  return stdout.trim();
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const fromLib = await tokenFromLibrary();
  const token = fromLib ?? (await tokenFromGcloudCli());
  if (!token) {
    throw new Error(
      "Unable to obtain a GCP access token. On GKE use Workload Identity; locally run `gcloud auth application-default login`.",
    );
  }
  cachedToken = { value: token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return token;
}
