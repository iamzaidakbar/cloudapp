import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Prefer a writable cache dir. In K8s Jobs the process runs as non-root under
// /app, so default to os.tmpdir() instead of process.cwd().
const PLUGIN_CACHE_DIR =
  process.env.TF_PLUGIN_CACHE_DIR?.trim() ||
  path.join(tmpdir(), "cloudshiftg-tf-plugin-cache");

type CliResult = { success: boolean; output: string };

// This module is the ONLY place a `terraform` subprocess is ever spawned in
// this codebase. `apply` and `destroy` (Migration Execution / Rollback) are
// both implemented below. `terraformDestroy` is reachable only through
// lib/terraform/run-rollback.ts, which itself is only invoked from
// app/api/migrations/[id]/rollback/route.ts's full guard chain: plan not
// already CANCELLED/ROLLED_BACK, real provisioned resources on record, and a
// typed confirmation (the plan's sequence number) matched server-side.
async function run(cwd: string, args: string[], allowedExitCodes: number[] = [0]): Promise<CliResult> {
  try {
    mkdirSync(PLUGIN_CACHE_DIR, { recursive: true });
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

// Real provisioning — creates actual, billable GCP resources. No `-out`
// reuse of an earlier saved plan (that file doesn't outlive its own
// ephemeral run directory); `apply` does its own fresh implicit plan first.
// The generated config is unchanged since the last `terraform plan`, so the
// outcome matches what was already shown and approved.
export async function terraformApply(cwd: string): Promise<CliResult> {
  return run(cwd, ["apply", "-no-color", "-input=false", "-auto-approve"]);
}

// Permanently tears down real GCP infrastructure. See this module's header
// comment for the full guard chain that must pass before this is ever
// reachable — there is no other, lighter-gated code path to it.
export async function terraformDestroy(cwd: string): Promise<CliResult> {
  return run(cwd, ["destroy", "-no-color", "-input=false", "-auto-approve"]);
}
