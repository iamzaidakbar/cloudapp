import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { withTenantContext } from "@/lib/db/with-tenant";
import { terraformInit, terraformValidate, terraformPlan, terraformShowText, terraformShowJson } from "@/lib/terraform/cli";

type ValidateJson = { valid: boolean; diagnostics?: unknown[] };
type ShowJson = { resource_changes?: Array<{ change?: { actions?: string[] } }> };

function countResourcesToCreate(showJsonOutput: string): number {
  try {
    const parsed = JSON.parse(showJsonOutput) as ShowJson;
    return (parsed.resource_changes ?? []).filter((rc) => rc.change?.actions?.includes("create")).length;
  } catch {
    return 0;
  }
}

export async function runTerraformCli(terraformRunId: string, tenantId: string): Promise<void> {
  const now = new Date();

  const run = await withTenantContext(tenantId, (tx) =>
    tx.terraformRun.findUniqueOrThrow({ where: { id: terraformRunId }, select: { terraformConfig: true } }),
  );

  await withTenantContext(tenantId, (tx) =>
    tx.terraformRun.update({ where: { id: terraformRunId }, data: { status: "RUNNING", startedAt: now } }),
  );

  let workDir: string | null = null;
  try {
    if (run.terraformConfig.includes("google_cloudfunctions2_function")) {
      const projectId =
        process.env.GCP_PROJECT_ID?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim();
      if (projectId) {
        const { ensureLambdaPlaceholderZip } = await import("@/lib/transfer/lambda-placeholder");
        await ensureLambdaPlaceholderZip(projectId);
      }
    }

    workDir = await mkdtemp(path.join(tmpdir(), "cloudshiftg-tf-"));
    await writeFile(path.join(workDir, "main.tf"), run.terraformConfig, "utf8");

    const init = await terraformInit(workDir);
    if (!init.success) {
      throw new Error(`terraform init failed: ${init.output.slice(0, 1000)}`);
    }

    const validate = await terraformValidate(workDir);
    let validateSucceeded = false;
    try {
      validateSucceeded = (JSON.parse(validate.output) as ValidateJson).valid === true;
    } catch {
      validateSucceeded = false;
    }

    await withTenantContext(tenantId, (tx) =>
      tx.terraformRun.update({
        where: { id: terraformRunId },
        data: { validateSucceeded, validateOutput: validate.output.slice(0, 10_000) },
      }),
    );

    if (!validateSucceeded) {
      await withTenantContext(tenantId, (tx) =>
        tx.terraformRun.update({
          where: { id: terraformRunId },
          data: { status: "FAILED", finishedAt: new Date(), errorMessage: "Generated Terraform failed validation." },
        }),
      );
      return;
    }

    const plan = await terraformPlan(workDir);
    if (!plan.success) {
      await withTenantContext(tenantId, (tx) =>
        tx.terraformRun.update({
          where: { id: terraformRunId },
          data: {
            status: "FAILED",
            finishedAt: new Date(),
            planSucceeded: false,
            planOutput: plan.output.slice(0, 10_000),
            errorMessage: "terraform plan failed — see plan output for the real error (e.g. an API not enabled on the target project).",
          },
        }),
      );
      return;
    }

    const [showText, showJson] = await Promise.all([terraformShowText(workDir), terraformShowJson(workDir)]);
    const resourcesToCreate = countResourcesToCreate(showJson.output);

    await withTenantContext(tenantId, (tx) =>
      tx.terraformRun.update({
        where: { id: terraformRunId },
        data: {
          status: "SUCCEEDED",
          finishedAt: new Date(),
          planSucceeded: true,
          planOutput: showText.output.slice(0, 20_000),
          resourcesToCreate,
        },
      }),
    );
  } catch (error) {
    console.error(`Terraform run ${terraformRunId} failed before completion:`, error);
    const message = error instanceof Error ? error.message : "Terraform run failed unexpectedly.";
    await withTenantContext(tenantId, (tx) =>
      tx.terraformRun.update({
        where: { id: terraformRunId },
        data: { status: "FAILED", finishedAt: new Date(), errorMessage: message.slice(0, 500) },
      }),
    );
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  }
}
