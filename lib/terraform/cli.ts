import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

// The persistent provider plugin cache — `terraform init` reuses downloaded
// provider binaries across runs instead of re-fetching ~30MB every time a
// migration plan's Terraform is (re)generated. Gitignored (see .gitignore).
const PLUGIN_CACHE_DIR = path.join(process.cwd(), ".terraform-plugin-cache");

type CliResult = { success: boolean; output: string };

// This module is the ONLY place a `terraform` subprocess is ever spawned in
// this codebase, and it deliberately exposes exactly these 4 read-only-safe
// subcommands — `apply`/`destroy` are not implemented here or anywhere else,
// not merely gated, so there is no code path capable of provisioning or
// destroying real infrastructure in this phase.
async function run(cwd: string, args: string[], allowedExitCodes: number[] = [0]): Promise<CliResult> {
  try {
    const { stdout } = await execFileAsync("terraform", args, {
      cwd,
      env: { ...process.env, TF_IN_AUTOMATION: "true", TF_PLUGIN_CACHE_DIR: PLUGIN_CACHE_DIR },
      maxBuffer: 20 * 1024 * 1024,
    });
    return { success: true, output: stdout };
  } catch (error) {
    const execError = error as { code?: number; stdout?: string; stderr?: string; message: string };
    if (execError.code !== undefined && allowedExitCodes.includes(execError.code)) {
      return { success: true, output: execError.stdout ?? "" };
    }
    return { success: false, output: [execError.stdout, execError.stderr].filter(Boolean).join("\n") || execError.message };
  }
}

export async function terraformInit(cwd: string): Promise<CliResult> {
  return run(cwd, ["init", "-input=false", "-no-color"]);
}

export async function terraformValidate(cwd: string): Promise<CliResult> {
  return run(cwd, ["validate", "-no-color", "-json"]);
}

// `terraform plan`'s own exit-code convention: 0 = no changes, 2 = changes
// present (both real successes), 1 = a genuine error.
export async function terraformPlan(cwd: string): Promise<CliResult> {
  return run(cwd, ["plan", "-no-color", "-input=false", "-out=tfplan"], [0, 2]);
}

export async function terraformShowText(cwd: string): Promise<CliResult> {
  return run(cwd, ["show", "-no-color", "tfplan"]);
}

export async function terraformShowJson(cwd: string): Promise<CliResult> {
  return run(cwd, ["show", "-json", "tfplan"]);
}
