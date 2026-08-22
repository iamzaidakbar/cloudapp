import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { withTenantContext } from "@/lib/db/with-tenant";
import { terraformInit, terraformApply } from "@/lib/terraform/cli";
import { slug } from "@/lib/terraform/generate";

type TfStateResource = {
  type: string;
  name: string;
  instances?: Array<{ attributes?: { self_link?: string; id?: string } }>;
};
type TfState = { resources?: TfStateResource[] };

function selfLinkFor(resource: TfStateResource): string | null {
  const attrs = resource.instances?.[0]?.attributes;
  return attrs?.self_link ?? attrs?.id ?? null;
}

// Terraform writes to the local state file for whatever it successfully
// created even when the overall `apply` command exits non-zero because a
// LATER, independent resource failed — confirmed the hard way: a real apply
// on 3 independent resources here left 1 successfully created while the
// other 2 failed, and the earlier version of this function discarded state
// entirely on any failure, leaving the successfully-created resource fully
// untracked by the app (real, billing, and invisible). This always tries to
// read state, on success or failure alike, and records whatever is real.
async function readState(workDir: string): Promise<{ raw: string; resources: TfStateResource[] } | null> {
  try {
    const raw = await readFile(path.join(workDir, "terraform.tfstate"), "utf8");
    const parsed = JSON.parse(raw) as TfState;
    return { raw, resources: parsed.resources ?? [] };
  } catch {
    return null;
  }
}

export async function runApply(applyRunId: string, tenantId: string): Promise<void> {
  const now = new Date();

  const applyRun = await withTenantContext(tenantId, (tx) =>
    tx.applyRun.findUniqueOrThrow({ where: { id: applyRunId }, select: { migrationPlanId: true } }),
  );

  const [terraformRun, resources, priorApplyRun] = await withTenantContext(tenantId, (tx) =>
    Promise.all([
      tx.terraformRun.findFirst({
        where: { tenantId, migrationPlanId: applyRun.migrationPlanId, status: "SUCCEEDED", planSucceeded: true },
        orderBy: { version: "desc" },
        select: { terraformConfig: true },
      }),
      tx.migrationResource.findMany({ where: { tenantId, migrationPlanId: applyRun.migrationPlanId } }),
      // The most recent EARLIER apply that actually created something for
      // real, if any — see the state-loading comment below for why this
      // matters. Excludes the current (just-created, QUEUED) run explicitly
      // rather than relying on resourcesCreated being null for it, which
      // would be true anyway but is worth not depending on implicitly.
      tx.applyRun.findFirst({
        where: { tenantId, migrationPlanId: applyRun.migrationPlanId, id: { not: applyRunId }, resourcesCreated: { gt: 0 } },
        orderBy: { version: "desc" },
        select: { terraformState: true },
      }),
    ]),
  );

  await withTenantContext(tenantId, (tx) =>
    tx.applyRun.update({ where: { id: applyRunId }, data: { status: "RUNNING", startedAt: now } }),
  );

  if (!terraformRun) {
    await withTenantContext(tenantId, (tx) =>
      tx.applyRun.update({
        where: { id: applyRunId },
        data: { status: "FAILED", finishedAt: new Date(), errorMessage: "No successfully-planned Terraform run found for this plan." },
      }),
    );
    return;
  }

  let workDir: string | null = null;
  try {
    if (terraformRun.terraformConfig.includes("google_cloudfunctions2_function")) {
      const projectId =
        process.env.GCP_PROJECT_ID?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim();
      if (projectId) {
        const { ensureLambdaPlaceholderZip } = await import("@/lib/transfer/lambda-placeholder");
        await ensureLambdaPlaceholderZip(projectId);
      }
    }

    workDir = await mkdtemp(path.join(tmpdir(), "cloudshiftg-apply-"));
    await writeFile(path.join(workDir, "main.tf"), terraformRun.terraformConfig, "utf8");

    // Without this, a re-run (or a retry after partial failure) starts from
    // a totally empty, memory-less state every time — Terraform has no idea
    // anything was already created, so it tries to CREATE the same
    // deterministically-named resource again, and GCP correctly rejects it
    // with a real 409 "already exists". Confirmed the hard way against a
    // real GCP project. Loading the prior real state first (same pattern
    // run-rollback.ts already uses before destroying) makes this apply
    // idempotent — Terraform sees what's really already there and only
    // creates the delta, exactly the FR-5.6 requirement ("re-running a
    // failed migration must not duplicate resources").
    if (priorApplyRun?.terraformState) {
      await writeFile(path.join(workDir, "terraform.tfstate"), priorApplyRun.terraformState, "utf8");
    }

    const init = await terraformInit(workDir);
    if (!init.success) {
      throw new Error(`terraform init failed: ${init.output.slice(0, 1000)}`);
    }

    const apply = await terraformApply(workDir);
    const state = await readState(workDir);
    const stateResources = state?.resources ?? [];

    await withTenantContext(tenantId, async (tx) => {
      for (const resource of resources) {
        const address = slug(resource.awsResourceId);
        const match = stateResources.find((r) => r.name === address);
        const selfLink = match ? selfLinkFor(match) : null;
        if (selfLink) {
          await tx.migrationResource.update({
            where: { id: resource.id },
            data: { gcpResourceSelfLink: selfLink, provisionedAt: new Date() },
          });
        }
      }

      await tx.applyRun.update({
        where: { id: applyRunId },
        data: {
          status: apply.success ? "SUCCEEDED" : "FAILED",
          finishedAt: new Date(),
          applyOutput: apply.output.slice(0, 20_000),
          resourcesCreated: stateResources.length,
          terraformState: state?.raw ?? null,
          errorMessage: apply.success
            ? null
            : stateResources.length > 0
              ? `terraform apply partially failed — ${stateResources.length} of ${resources.length} resource(s) were created for real before the error (see output). Nothing was left untracked.`
              : "terraform apply failed — see output for the real error.",
        },
      });
    });
  } catch (error) {
    console.error(`Apply run ${applyRunId} failed before completion:`, error);
    const message = error instanceof Error ? error.message : "Terraform apply failed unexpectedly.";
    await withTenantContext(tenantId, (tx) =>
      tx.applyRun.update({
        where: { id: applyRunId },
        data: { status: "FAILED", finishedAt: new Date(), errorMessage: message.slice(0, 500) },
      }),
    );
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  }
}
