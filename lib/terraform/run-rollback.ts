import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { withTenantContext } from "@/lib/db/with-tenant";
import { terraformInit, terraformApply, terraformDestroy } from "@/lib/terraform/cli";
import { generateTerraformConfig } from "@/lib/terraform/generate";
import { getTerraformSourceResources } from "@/lib/terraform-runs";
import { slug } from "@/lib/terraform/generate";
import { env } from "@/lib/env";

type TfStateResource = { type: string; name: string };
type TfState = { resources?: TfStateResource[] };

async function readState(workDir: string): Promise<{ raw: string; resources: TfStateResource[] } | null> {
  try {
    const raw = await readFile(path.join(workDir, "terraform.tfstate"), "utf8");
    const parsed = JSON.parse(raw) as TfState;
    return { raw, resources: parsed.resources ?? [] };
  } catch {
    return null;
  }
}

export async function runRollback(rollbackRunId: string, tenantId: string): Promise<void> {
  const now = new Date();

  const rollbackRun = await withTenantContext(tenantId, (tx) =>
    tx.rollbackRun.findUniqueOrThrow({ where: { id: rollbackRunId }, select: { migrationPlanId: true } }),
  );

  const [applyRun, resources] = await withTenantContext(tenantId, (tx) =>
    Promise.all([
      tx.applyRun.findFirst({
        where: { tenantId, migrationPlanId: rollbackRun.migrationPlanId, resourcesCreated: { gt: 0 } },
        orderBy: { version: "desc" },
        select: { terraformState: true },
      }),
      tx.migrationResource.findMany({ where: { tenantId, migrationPlanId: rollbackRun.migrationPlanId } }),
    ]),
  );

  await withTenantContext(tenantId, (tx) =>
    tx.rollbackRun.update({ where: { id: rollbackRunId }, data: { status: "RUNNING", startedAt: now } }),
  );

  if (!applyRun?.terraformState) {
    await withTenantContext(tenantId, (tx) =>
      tx.rollbackRun.update({
        where: { id: rollbackRunId },
        data: { status: "FAILED", finishedAt: new Date(), errorMessage: "No persisted apply state found for this plan." },
      }),
    );
    return;
  }

  if (!env.GCP_PROJECT_ID) {
    await withTenantContext(tenantId, (tx) =>
      tx.rollbackRun.update({
        where: { id: rollbackRunId },
        data: { status: "FAILED", finishedAt: new Date(), errorMessage: "GCP_PROJECT_ID is not set." },
      }),
    );
    return;
  }

  const provisionedBefore = new Set(resources.filter((r) => r.gcpResourceSelfLink).map((r) => r.id));

  let workDir: string | null = null;
  try {
    workDir = await mkdtemp(path.join(tmpdir(), "cloudshiftg-rollback-"));
    await writeFile(path.join(workDir, "terraform.tfstate"), applyRun.terraformState, "utf8");

    const sourceResources = await getTerraformSourceResources(tenantId, rollbackRun.migrationPlanId);
    const terraformConfig = generateTerraformConfig(sourceResources, env.GCP_PROJECT_ID, { disableDeletionProtection: true });
    await writeFile(path.join(workDir, "main.tf"), terraformConfig, "utf8");

    const init = await terraformInit(workDir);
    if (!init.success) {
      throw new Error(`terraform init failed: ${init.output.slice(0, 1000)}`);
    }

    // Cloud SQL instances are generated with deletion_protection = true (a
    // real GCP/Terraform safety default) — destroy fails outright against a
    // protected instance. The config just written already has that flag
    // flipped off; applying it first only updates that one field in place
    // (state already matches everywhere else, so nothing is recreated)
    // before destroy runs — the same two-step a human operator would do.
    const hasProtectedRds = resources.some((r) => r.awsService === "RDS_INSTANCE" && r.gcpResourceSelfLink);
    if (hasProtectedRds) {
      const prepare = await terraformApply(workDir);
      if (!prepare.success) {
        throw new Error(`Disabling Cloud SQL deletion protection failed: ${prepare.output.slice(0, 1000)}`);
      }
    }

    const destroy = await terraformDestroy(workDir);
    const state = await readState(workDir);
    const remainingAddresses = new Set((state?.resources ?? []).map((r) => r.name));

    await withTenantContext(tenantId, async (tx) => {
      let resourcesDestroyed = 0;
      for (const resource of resources) {
        if (!resource.gcpResourceSelfLink) continue;
        const address = slug(resource.awsResourceId);
        if (remainingAddresses.has(address)) continue; // destroy failed for this one — leave it tracked as real

        resourcesDestroyed += 1;
        await tx.migrationResource.update({
          where: { id: resource.id },
          data: { gcpResourceSelfLink: null, provisionedAt: null },
        });
      }

      await tx.rollbackRun.update({
        where: { id: rollbackRunId },
        data: {
          status: destroy.success ? "SUCCEEDED" : "FAILED",
          finishedAt: new Date(),
          destroyOutput: destroy.output.slice(0, 20_000),
          resourcesDestroyed,
          errorMessage: destroy.success
            ? null
            : resourcesDestroyed > 0
              ? `terraform destroy partially failed — ${resourcesDestroyed} of ${provisionedBefore.size} resource(s) were destroyed for real before the error (see output).`
              : "terraform destroy failed — see output for the real error.",
        },
      });

      if (destroy.success && resourcesDestroyed === provisionedBefore.size) {
        await tx.migrationPlan.update({
          where: { id: rollbackRun.migrationPlanId },
          data: { status: "ROLLED_BACK", rolledBackAt: new Date() },
        });
      }
    });
  } catch (error) {
    console.error(`Rollback run ${rollbackRunId} failed before completion:`, error);
    const message = error instanceof Error ? error.message : "Rollback failed unexpectedly.";
    await withTenantContext(tenantId, (tx) =>
      tx.rollbackRun.update({
        where: { id: rollbackRunId },
        data: { status: "FAILED", finishedAt: new Date(), errorMessage: message.slice(0, 500) },
      }),
    );
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  }
}
