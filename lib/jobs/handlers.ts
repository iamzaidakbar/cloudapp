import { runAudit } from "@/lib/aws/audit/run-audit";
import { runComparison } from "@/lib/pricing/run-comparison";
import { runTerraformCli } from "@/lib/terraform/run-terraform";
import { runApply } from "@/lib/terraform/run-apply";
import { runRollback } from "@/lib/terraform/run-rollback";
import { runTransfer } from "@/lib/transfer/run-transfer";
import type { JobMessage } from "@/lib/jobs/types";

export async function handleJob(job: JobMessage): Promise<void> {
  switch (job.type) {
    case "AUDIT":
      await runAudit(job.runId, job.tenantId);
      return;
    case "COMPARISON":
      await runComparison(job.runId, job.tenantId);
      return;
    case "TERRAFORM":
      await runTerraformCli(job.runId, job.tenantId);
      return;
    case "APPLY":
      await runApply(job.runId, job.tenantId);
      return;
    case "ROLLBACK":
      await runRollback(job.runId, job.tenantId);
      return;
    case "DATA_TRANSFER":
      await runTransfer(job.runId, job.tenantId);
      return;
    default: {
      const _exhaustive: never = job.type;
      throw new Error(`Unknown job type: ${_exhaustive}`);
    }
  }
}
