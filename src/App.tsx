import React, { useState, useCallback, useMemo } from 'react';
import { Container, Box, AppBar, Toolbar, Typography, CircularProgress, Snackbar, Alert } from '@mui/material';
import { DynamicFormEngine } from './components/DynamicFormEngine';
import { normalizeValidationErrors } from './utils/validationUtils';
import { ParticipantTree } from './components/ParticipantTree';
import { OnboardingStepper } from './components/OnboardingStepper';
import { useDebouncedAutosave } from './hooks/useDebouncedAutosave';
import { getStepSchema, getStepLabels } from './utils/schemaBuilder';
import { validateStep } from './utils/schemaValidator';
import type { EntityParticipant } from './types/rpc';

const CASE_ID = 'CASE-PB-2026-001';

export const App: React.FC = () => {
  // 1. Local Staging Workspace State
  const [formData, setFormData] = useState<Record<string, unknown>>({
    isTaxResidentSG: true,
    isAccreditedInvestor: false,
    participants: [] as EntityParticipant[],
  });

  const [activeStep, setActiveStep] = useState(0);
  const [stepSubmitted, setStepSubmitted] = useState<Record<number, boolean>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // 2. Get step labels dynamically from schema
  const stepLabels = useMemo(() => getStepLabels(), []);

  // 3. Get schema for current step (extracted without tabs)
  const currentStepSchema = useMemo(() => getStepSchema(activeStep), [activeStep]);

  // 4. Attach Debounced Autosave Hook (500ms delay)
  const { status, lastSavedAt } = useDebouncedAutosave(CASE_ID, formData, 500);

  // 5. Track completed steps based on current JSON Schema validity
  const completedSteps = useMemo(() => {
    const completed = new Set<number>();
    for (let i = 0; i < stepLabels.length; i++) {
      if (validateStep(i, formData).isValid) {
        completed.add(i);
      }
    }
    return completed;
  }, [stepLabels.length, formData]);

  // 6. Step validation handler
  const handleValidateStep = useCallback(
    (stepIndex: number) => {
      return validateStep(stepIndex, formData);
    },
    [formData]
  );

  // 7. Handle validation errors when attempting to navigate or submit
  const handleValidationError = useCallback(
    (errors: Record<string, string>, stepIndex: number) => {
      setStepSubmitted((prev) => ({ ...prev, [stepIndex]: true }));
      setFormErrors(errors);
      setActiveStep(stepIndex);
    },
    []
  );

  // 8. Handle Step Change
  const handleStepChange = useCallback((newStep: number) => {
    setActiveStep(newStep);
    // If step was previously submitted, keep its validation errors synced
    if (stepSubmitted[newStep]) {
      const stepValidation = validateStep(newStep, formData);
      if (stepValidation.isValid) {
        setFormErrors({});
      } else {
        setFormErrors(stepValidation.errors);
      }
    } else {
      setFormErrors({});
    }
  }, [formData, stepSubmitted]);

  // 9. Handle Form Changes from bpmn-io Form Engine
  const handleFormChange = useCallback(
    (newData: Record<string, unknown>, engineErrors: Record<string, unknown>) => {
      const mergedData = {
        ...formData,
        ...newData,
      };

      setFormData(mergedData);

      // Re-validate against JSON schema
      const stepValidation = validateStep(activeStep, mergedData);
      const normalizedEngineErrors = normalizeValidationErrors(engineErrors || {});

      // Clear stale errors immediately once the current step becomes valid.
      if (stepValidation.isValid) {
        setFormErrors({});
        return;
      }

      // Only expose formErrors to children if the step has been submitted (Next button clicked)
      if (stepSubmitted[activeStep]) {
        const errorMap: Record<string, string> = {
          ...normalizeValidationErrors(stepValidation.errors),
          ...normalizedEngineErrors,
        };
        setFormErrors(errorMap);
      } else {
        setFormErrors({});
      }
    },
    [activeStep, formData, stepSubmitted]
  );

  // 10. Handle Dynamic Participant Tree Updates (Tab 3)
  const handleParticipantsUpdate = useCallback((updatedParticipants: EntityParticipant[]) => {
    setFormData((prev) => {
      const merged = {
        ...prev,
        participants: updatedParticipants,
      };
      return merged;
    });
  }, []);

  // 11. Handle Final Submission
  const handleSubmit = useCallback(() => {
    setSubmissionSuccess(true);
  }, []);

  const isCurrentStepSubmitted = Boolean(stepSubmitted[activeStep]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      {/* Save Status Header */}
      <AppBar position="sticky">
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Private Banking Onboarding
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Case ID: {CASE_ID}
            </Typography>
          </Box>

          {/* Autosave Indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {status === 'saving' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} sx={{ color: 'inherit' }} />
                <Typography variant="body2">Saving...</Typography>
              </Box>
            )}
            {status === 'saved' && (
              <Typography variant="body2" sx={{ color: '#4caf50' }}>
                ✓ Saved at {lastSavedAt}
              </Typography>
            )}
            {status === 'error' && (
              <Typography variant="body2" sx={{ color: '#f44336' }}>
                Autosave Failed
              </Typography>
            )}
            {status === 'idle' && (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Idle
              </Typography>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        {/* Stepper Navigation */}
        <OnboardingStepper
          steps={stepLabels}
          activeStep={activeStep}
          onStepChange={handleStepChange}
          onValidateStep={handleValidateStep}
          onValidationError={handleValidationError}
          onSubmit={handleSubmit}
          completedSteps={completedSteps}
          hasErrors={isCurrentStepSubmitted && Object.keys(formErrors).length > 0}
          disableNextOnErrors={true}
        >
          {/* Step 0: Entity Profile */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Entity Structure & Profile
              </Typography>
              <DynamicFormEngine
                schema={currentStepSchema}
                initialData={formData}
                externalErrors={formErrors}
                showAllErrors={isCurrentStepSubmitted}
                onChange={handleFormChange}
              />
            </Box>
          )}

          {/* Step 1: Tax & Regulatory */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Tax & Regulatory Profiling
              </Typography>
              <DynamicFormEngine
                schema={currentStepSchema}
                initialData={formData}
                externalErrors={formErrors}
                showAllErrors={isCurrentStepSubmitted}
                onChange={handleFormChange}
              />
            </Box>
          )}

          {/* Step 2: Ownership Tree */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Entity Ownership & Relationship Tree
              </Typography>
              <ParticipantTree
                caseId={CASE_ID}
                participants={(formData.participants as EntityParticipant[]) || []}
                showAllErrors={isCurrentStepSubmitted}
                onUpdate={handleParticipantsUpdate}
              />
            </Box>
          )}
        </OnboardingStepper>
      </Container>

      {/* Submission Success Toast */}
      <Snackbar
        open={submissionSuccess}
        autoHideDuration={6000}
        onClose={() => setSubmissionSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSubmissionSuccess(false)}
          severity="success"
          variant="filled"
          sx={{ width: '100%', fontSize: '1rem', boxShadow: 3 }}
          data-testid="submission-success-alert"
        >
          Onboarding Dossier for {CASE_ID} submitted successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default App;