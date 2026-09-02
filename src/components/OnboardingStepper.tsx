import React, { useState } from 'react';
import { Stepper, Step, StepLabel, StepButton, Button, Box, Paper, Stack, Alert, CircularProgress } from '@mui/material';

export interface StepValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

interface OnboardingStepperProps {
  steps: string[];
  activeStep?: number;
  onStepChange?: (activeStep: number) => void;
  onValidateStep?: (stepIndex: number) => StepValidationResult;
  onValidationError?: (errors: Record<string, string>, stepIndex: number) => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  completedSteps?: number[] | Set<number>;
  hasErrors?: boolean;
  disableNextOnErrors?: boolean;
  errorMessage?: string | null;
  children?: React.ReactNode;
}

export function OnboardingStepper({
  steps,
  activeStep: controlledActiveStep,
  onStepChange,
  onValidateStep,
  onValidationError,
  onSubmit,
  isSubmitting = false,
  completedSteps,
  hasErrors = false,
  disableNextOnErrors = true,
  errorMessage,
  children,
}: OnboardingStepperProps) {
  const [internalActiveStep, setInternalActiveStep] = useState(0);
  const activeStep = controlledActiveStep !== undefined ? controlledActiveStep : internalActiveStep;

  const isStepCompleted = (index: number): boolean => {
    if (completedSteps instanceof Set) {
      return completedSteps.has(index);
    }
    if (Array.isArray(completedSteps)) {
      return completedSteps.includes(index);
    }
    return false;
  };

  const navigateTo = (targetStep: number) => {
    if (targetStep === activeStep) return;

    if (targetStep < activeStep) {
      // Backward navigation is always allowed
      setInternalActiveStep(targetStep);
      onStepChange?.(targetStep);
      return;
    }

    // Forward navigation: validate all prerequisite steps from 0 to targetStep - 1
    if (onValidateStep) {
      for (let i = 0; i < targetStep; i++) {
        const validation = onValidateStep(i);
        if (!validation.isValid) {
          onValidationError?.(validation.errors, i);
          return; // Block navigation
        }
      }
    }

    // Also check current hasErrors flag if disableNextOnErrors is true
    if (hasErrors && disableNextOnErrors) {
      return;
    }

    setInternalActiveStep(targetStep);
    onStepChange?.(targetStep);
  };

  const handleNext = () => {
    if (isSubmitting) return;

    if (activeStep < steps.length - 1) {
      const nextStep = activeStep + 1;
      // Validate current step before advancing
      if (onValidateStep) {
        const validation = onValidateStep(activeStep);
        if (!validation.isValid) {
          onValidationError?.(validation.errors, activeStep);
          return;
        }
      }
      navigateTo(nextStep);
    } else {
      // Final Step: Submit / Finish action
      if (onValidateStep) {
        for (let i = 0; i < steps.length; i++) {
          const validation = onValidateStep(i);
          if (!validation.isValid) {
            onValidationError?.(validation.errors, i);
            if (i !== activeStep) {
              setInternalActiveStep(i);
              onStepChange?.(i);
            }
            return;
          }
        }
      }
      onSubmit?.();
    }
  };

  const handleBack = () => {
    const prevStep = Math.max(activeStep - 1, 0);
    navigateTo(prevStep);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stepper activeStep={activeStep} nonLinear>
          {steps.map((label, index) => {
            const completed = isStepCompleted(index);
            return (
              <Step key={label} completed={completed}>
                <StepButton
                  onClick={() => navigateTo(index)}
                  color="inherit"
                  data-testid={`step-button-${index}`}
                >
                  <StepLabel error={activeStep === index && hasErrors}>{label}</StepLabel>
                </StepButton>
              </Step>
            );
          })}
        </Stepper>
      </Paper>

      {hasErrors && disableNextOnErrors && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {errorMessage || 'Please fix validation errors before proceeding to the next step.'}
        </Alert>
      )}

      <Paper sx={{ minHeight: '300px', p: 3, mb: 3 }}>
        <Box>{children}</Box>
      </Paper>

      <Stack
        direction="row"
        spacing={2}
        sx={{ justifyContent: 'space-between', mt: 4 }}
      >
        <Button disabled={activeStep === 0 || isSubmitting} onClick={handleBack} variant="outlined" data-testid="back-button">
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={isSubmitting}
          color={activeStep === steps.length - 1 ? 'success' : 'primary'}
          data-testid="next-button"
        >
          {isSubmitting && <CircularProgress size={22} color="inherit" />}
          {isSubmitting ? 'Submitting' : activeStep === steps.length - 1 ? 'Submit Application' : 'Next'}
        </Button>
      </Stack>
    </Box>
  );
}
