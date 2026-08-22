"use client";

import { useState } from "react";
import { TerraformPanel, type TerraformRunSummary } from "@/components/migrations/terraform-panel";
import { ApplyPanel, type ApplyRunSummary } from "@/components/migrations/apply-panel";
import { VerificationPanel } from "@/components/migrations/verification-panel";
import type { ComponentProps } from "react";

type VerificationRunSummary = NonNullable<
  ComponentProps<typeof VerificationPanel>["initialVerificationRun"]
>;

export function MigrationExecutionPanels({
  migrationPlanId,
  initialTerraformRun,
  initialApplyRun,
  initialVerificationRun,
}: {
  migrationPlanId: string;
  initialTerraformRun: TerraformRunSummary | null;
  initialApplyRun: ApplyRunSummary | null;
  initialVerificationRun: VerificationRunSummary | null;
}) {
  const [terraformRun, setTerraformRun] = useState(initialTerraformRun);
  const [applyRun, setApplyRun] = useState(initialApplyRun);

  const canExecute =
    terraformRun?.status === "SUCCEEDED" && terraformRun.planSucceeded === true;
  const canVerify = applyRun?.status === "SUCCEEDED";

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
    </>
  );
}
