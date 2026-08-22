"use client";

import { useState } from "react";
import { TerraformPanel, type TerraformRunSummary } from "@/components/migrations/terraform-panel";
import { ApplyPanel, type ApplyRunSummary } from "@/components/migrations/apply-panel";
import { VerificationPanel } from "@/components/migrations/verification-panel";
import { TransferPanel, type TransferRunSummary, type TransferRdsTarget } from "@/components/migrations/transfer-panel";
import type { ComponentProps } from "react";

type VerificationRunSummary = NonNullable<
  ComponentProps<typeof VerificationPanel>["initialVerificationRun"]
>;

export function MigrationExecutionPanels({
  migrationPlanId,
  initialTerraformRun,
  initialApplyRun,
  initialVerificationRun,
  initialTransferRun,
  hasEligibleTransferResources,
  rdsTransferTargets = [],
}: {
  migrationPlanId: string;
  initialTerraformRun: TerraformRunSummary | null;
  initialApplyRun: ApplyRunSummary | null;
  initialVerificationRun: VerificationRunSummary | null;
  initialTransferRun: TransferRunSummary | null;
  /** True if the plan includes S3 or RDS transfer targets. */
  hasEligibleTransferResources: boolean;
  rdsTransferTargets?: TransferRdsTarget[];
}) {
  const [terraformRun, setTerraformRun] = useState(initialTerraformRun);
  const [applyRun, setApplyRun] = useState(initialApplyRun);

  const canExecute =
    terraformRun?.status === "SUCCEEDED" && terraformRun.planSucceeded === true;
  const applySucceeded = applyRun?.status === "SUCCEEDED";
  const canVerify = applySucceeded;
  // Show as soon as Apply polls SUCCEEDED — same moment as Verification.
  const canTransfer = applySucceeded && hasEligibleTransferResources;

  return (
    <>
      <TerraformPanel
        migrationPlanId={migrationPlanId}
        initialTerraformRun={initialTerraformRun}
        onRunChange={setTerraformRun}
      />

      {canExecute ? (
        <ApplyPanel
          migrationPlanId={migrationPlanId}
          initialApplyRun={initialApplyRun}
          onRunChange={setApplyRun}
        />
      ) : null}

      {canVerify ? (
        <VerificationPanel
          migrationPlanId={migrationPlanId}
          initialVerificationRun={initialVerificationRun}
        />
      ) : null}

      {canTransfer ? (
        <TransferPanel
          migrationPlanId={migrationPlanId}
          initialTransferRun={initialTransferRun}
          rdsTargets={rdsTransferTargets}
        />
      ) : null}
    </>
  );
}
