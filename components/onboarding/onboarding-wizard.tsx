"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Tenant, AwsConnection } from "@/lib/generated/prisma/client";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { StepOrganization } from "@/components/onboarding/step-organization";
import { StepAwsRole } from "@/components/onboarding/step-aws-role";
import { StepVerify } from "@/components/onboarding/step-verify";
import { StepComplete } from "@/components/onboarding/step-complete";
import { durations, easing } from "@/components/motion/tokens";

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

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step-organization"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: durations.base, ease: easing }}
          >
            <StepOrganization
              onCreated={(result) => {
                setTenant(result.tenant);
                setConnection(result.connection);
                setStep(2);
              }}
            />
          </motion.div>
        )}

        {step === 2 && tenant && connection && (
          <motion.div
            key="step-aws-role"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: durations.base, ease: easing }}
          >
            <StepAwsRole
              connection={connection}
              onSaved={(updatedConnection) => {
                setConnection(updatedConnection);
                setStep(3);
              }}
            />
          </motion.div>
        )}

        {step === 3 && tenant && connection && (
          <motion.div
            key="step-verify"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: durations.base, ease: easing }}
          >
            <StepVerify
              connection={connection}
              onVerified={(updatedConnection) => {
                setConnection(updatedConnection);
                setStep(4);
              }}
              onEditRole={() => setStep(2)}
            />
          </motion.div>
        )}

        {step === 4 && tenant && connection && (
          <motion.div
            key="step-complete"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: durations.base, ease: easing }}
          >
            <StepComplete tenant={tenant} connection={connection} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
