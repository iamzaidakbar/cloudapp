import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// The only place a `gcloud` subprocess is ever spawned in this codebase —
// same "one CLI-wrapping module" discipline as lib/terraform/cli.ts. Reuses
// the exact Application Default Credentials session `terraform apply`'s
// Google provider already relies on (`gcloud auth application-default
// login`), so verification checks run under the same identity/permissions as
// provisioning. No service-account key file involved.
let cachedToken: { value: string; expiresAt: number } | null = null;
const TOKEN_TTL_MS = 50 * 60 * 1000; // real token lifetime is 60 min; refresh a bit early

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  // `exec` (shell-resolved), not `execFile`, because the Google Cloud SDK
  // installs `gcloud` as a `gcloud.cmd` batch wrapper on Windows (unlike
  // Terraform, which ships a real .exe) — execFile can't resolve a .cmd
  // without a shell, confirmed the hard way (`spawn gcloud ENOENT`) rather
  // than assumed. The command is a fixed literal with no interpolated input,
  // so shell execution here carries no injection risk.
  const { stdout } = await execAsync("gcloud auth application-default print-access-token");
  const token = stdout.trim();
  cachedToken = { value: token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return token;
}
