import { validateStep } from '../utils/schemaValidator';

describe('OnboardingStepper Form-Step Validation & Navigation Logic', () => {
  const stepLabels = [
    'Entity Profile & Structure',
    'Tax & Regulatory Profiling',
    'Entity Ownership & Relationship Tree',
  ];

  // Helper simulating stepper state controller
  class StepperController {
    activeStep = 0;
    formData: Record<string, unknown> = {};
    errors: Record<string, string> = {};
    completedSteps = new Set<number>();

    constructor(initialData: Record<string, unknown> = {}) {
      this.formData = { ...initialData };
      this.syncCompletedSteps();
    }

    syncCompletedSteps() {
      this.completedSteps.clear();
      for (let i = 0; i < stepLabels.length; i++) {
        if (validateStep(i, this.formData).isValid) {
          this.completedSteps.add(i);
        }
      }
    }

    updateFormData(data: Record<string, unknown>) {
      this.formData = { ...this.formData, ...data };
      this.syncCompletedSteps();
    }

    onValidateStep(stepIndex: number) {
      return validateStep(stepIndex, this.formData);
    }

    navigateTo(targetStep: number): boolean {
      if (targetStep === this.activeStep) return true;

      // Backward navigation
      if (targetStep < this.activeStep) {
        this.activeStep = targetStep;
        this.errors = {};
        return true;
      }

      // Forward navigation (Next or Direct click)
      for (let i = 0; i < targetStep; i++) {
        const validation = this.onValidateStep(i);
        if (!validation.isValid) {
          this.errors = validation.errors;
          return false; // Navigation blocked
        }
      }

      this.activeStep = targetStep;
      this.errors = {};
      return true;
    }

    handleNext(): boolean {
      return this.navigateTo(this.activeStep + 1);
    }

    handleBack(): boolean {
      return this.navigateTo(this.activeStep - 1);
    }
  }

  it('Requirement: User starts on Step 0 (Step 1 in UI)', () => {
    const stepper = new StepperController({
      isTaxResidentSG: true,
      isAccreditedInvestor: false,
    });

    expect(stepper.activeStep).toBe(0);
    expect(stepper.completedSteps.has(0)).toBe(false);
  });

  it('Requirement: invalid Step 0 → clicking Next cannot proceed and populates errors', () => {
    const stepper = new StepperController({
      isTaxResidentSG: true,
      isAccreditedInvestor: false,
    });

    const proceeded = stepper.handleNext();

    expect(proceeded).toBe(false);
    expect(stepper.activeStep).toBe(0); // Remains on Step 0
    expect(Object.keys(stepper.errors).length).toBeGreaterThan(0);
    expect(stepper.errors.entityName).toBeDefined();
    expect(stepper.errors.entityType).toBeDefined();
    expect(stepper.completedSteps.has(0)).toBe(false);
  });

  it('Requirement: valid Step 0 → clicking Next proceeds to Step 1 and marks Step 0 completed', () => {
    const stepper = new StepperController({
      isTaxResidentSG: true,
      isAccreditedInvestor: false,
    });

    // Provide valid Step 0 data
    stepper.updateFormData({
      entityName: 'Apex Capital Holdings Ltd',
      entityType: 'CORPORATE',
      registrationNumber: '202612345A',
      countryOfIncorporation: 'SG',
    });

    const proceeded = stepper.handleNext();

    expect(proceeded).toBe(true);
    expect(stepper.activeStep).toBe(1);
    expect(stepper.completedSteps.has(0)).toBe(true);
    expect(Object.keys(stepper.errors).length).toBe(0);
  });

  it('Requirement: direct navigation to Step 1 (or Step 2) while Step 0 is invalid is blocked', () => {
    const stepper = new StepperController({
      isTaxResidentSG: true,
      isAccreditedInvestor: false,
    });

    // Attempt direct click to Step 1
    const navStep1 = stepper.navigateTo(1);
    expect(navStep1).toBe(false);
    expect(stepper.activeStep).toBe(0);
    expect(stepper.errors.entityName).toBeDefined();

    // Attempt direct click to Step 2
    const navStep2 = stepper.navigateTo(2);
    expect(navStep2).toBe(false);
    expect(stepper.activeStep).toBe(0);
  });

  it('Requirement: direct navigation to Step 2 while Step 1 is invalid is blocked', () => {
    const stepper = new StepperController({
      entityName: 'Apex Capital Holdings Ltd',
      entityType: 'CORPORATE',
      registrationNumber: '202612345A',
      countryOfIncorporation: 'SG',
      isTaxResidentSG: false, // Step 1 invalid because TIN is missing for non-SG tax resident
      tinNumber: '',
    });

    // User is on Step 0 or Step 1
    stepper.activeStep = 1;

    // Attempt direct click to Step 2
    const navStep2 = stepper.navigateTo(2);
    expect(navStep2).toBe(false);
    expect(stepper.activeStep).toBe(1);
    expect(stepper.errors.tinNumber).toBeDefined();
  });

  it('Requirement: Back navigation works normally at all times', () => {
    const stepper = new StepperController({
      entityName: 'Apex Capital Holdings Ltd',
      entityType: 'CORPORATE',
      registrationNumber: '202612345A',
      countryOfIncorporation: 'SG',
      isTaxResidentSG: true,
      isAccreditedInvestor: false,
    });

    // Proceed to Step 1
    stepper.handleNext();
    expect(stepper.activeStep).toBe(1);

    // Navigate back to Step 0
    const backed = stepper.handleBack();
    expect(backed).toBe(true);
    expect(stepper.activeStep).toBe(0);
  });

  it('Requirement: returning to Step 0 and making it invalid revokes completion and prevents proceeding again', () => {
    const stepper = new StepperController({
      entityName: 'Apex Capital Holdings Ltd',
      entityType: 'CORPORATE',
      registrationNumber: '202612345A',
      countryOfIncorporation: 'SG',
      isTaxResidentSG: true,
      isAccreditedInvestor: false,
    });

    // 1. Valid Step 0 proceeds to Step 1
    expect(stepper.handleNext()).toBe(true);
    expect(stepper.activeStep).toBe(1);
    expect(stepper.completedSteps.has(0)).toBe(true);

    // 2. Go back to Step 0
    expect(stepper.handleBack()).toBe(true);
    expect(stepper.activeStep).toBe(0);

    // 3. Make Step 0 invalid (clear entityName)
    stepper.updateFormData({ entityName: '' });
    expect(stepper.completedSteps.has(0)).toBe(false); // Completion revoked!

    // 4. Attempt to proceed forward to Step 1 again -> BLOCKED!
    const tryNext = stepper.handleNext();
    expect(tryNext).toBe(false);
    expect(stepper.activeStep).toBe(0);
    expect(stepper.errors.entityName).toBeDefined();

    // 5. Restore valid data -> CAN proceed again!
    stepper.updateFormData({ entityName: 'Apex Capital Holdings Ltd' });
    expect(stepper.completedSteps.has(0)).toBe(true);
    expect(stepper.handleNext()).toBe(true);
    expect(stepper.activeStep).toBe(1);
  });

  it('Requirement: Final step submission validates all steps and triggers errors if invalid', () => {
    const stepper = new StepperController({
      entityName: 'Apex Capital Holdings Ltd',
      entityType: 'CORPORATE',
      registrationNumber: '202612345A',
      countryOfIncorporation: 'SG',
      isTaxResidentSG: true,
      isAccreditedInvestor: false,
      participants: [
        {
          participantName: '', // Invalid participant on Step 2
          participantRole: 'UBO',
          shareholdingPercentage: 100,
        },
      ],
    });

    // Advance to Step 1
    expect(stepper.handleNext()).toBe(true);
    expect(stepper.activeStep).toBe(1);

    // Advance to Step 2
    expect(stepper.handleNext()).toBe(true);
    expect(stepper.activeStep).toBe(2);

    // Step 2 is invalid because participantName is empty
    const step2Validation = stepper.onValidateStep(2);
    expect(step2Validation.isValid).toBe(false);
    expect(step2Validation.errors['participants[0].participantName']).toBeDefined();
  });
});
