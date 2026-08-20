"use client";

import { useState } from "react";
import type { Tenant, AwsConnection } from "@/lib/generated/prisma/client";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { StepOrganization } from "@/components/onboarding/step-organization";
import { StepAwsRole } from "@/components/onboarding/step-aws-role";
import { StepVerify } from "@/components/onboarding/step-verify";
import { StepComplete } from "@/components/onboarding/step-complete";

type OnboardingWizardProps = {
  initialStep: number;
  initialTenant: Tenant | null;
  initialConnection: AwsConnection | null;
};

export function OnboardingWizard({
  initialStep,
  initialTenant,
  initialConnection,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(initialStep);
  const [tenant, setTenant] = useState(initialTenant);
  const [connection, setConnection] = useState(initialConnection);

  return (
    <div>
      <StepIndicator step={step} />

      {step === 1 && (
        <StepOrganization
          onCreated={(result) => {
            setTenant(result.tenant);
            setConnection(result.connection);
            setStep(2);
          }}
        />
      )}

      {step === 2 && tenant && connection && (
        <StepAwsRole
          connection={connection}
          onSaved={(updatedConnection) => {
            setConnection(updatedConnection);
            setStep(3);
          }}
        />
      )}

      {step === 3 && tenant && connection && (
        <StepVerify
          connection={connection}
          onVerified={(updatedConnection) => {
            setConnection(updatedConnection);
            setStep(4);
          }}
          onEditRole={() => setStep(2)}
        />
      )}

      {step === 4 && tenant && connection && (
        <StepComplete tenant={tenant} connection={connection} />
      )}
    </div>
  );
}
