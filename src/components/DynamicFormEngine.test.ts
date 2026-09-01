jest.mock('@bpmn-io/form-js', () => ({
  Form: class MockForm {},
}));

import { validateStep } from '../utils/schemaValidator';
import { normalizeValidationErrors } from '../utils/validationUtils';

describe('DynamicFormEngine Validation Error Display Rules', () => {
  // Helper simulating DynamicFormEngine error display filtering logic
  function computeDisplayedErrors(
    externalErrors: Record<string, string>,
    internalErrors: Record<string, string>,
    showAllErrors: boolean
  ): Record<string, string> {
    if (!showAllErrors) {
      return {};
    }
    return { ...externalErrors, ...internalErrors };
  }

  it('Rule 1: On page load (showAllErrors=false), no validation errors are displayed', () => {
    const emptyFormData = {};
    const stepValidation = validateStep(0, emptyFormData);

    expect(stepValidation.isValid).toBe(false);
    expect(Object.keys(stepValidation.errors).length).toBeGreaterThan(0);

    const displayedErrors = computeDisplayedErrors(
      stepValidation.errors,
      {},
      false // Initial page load
    );

    // No errors should be displayed on page load
    expect(Object.keys(displayedErrors).length).toBe(0);
  });

  it('Rule 2: When Next or Submit is clicked (showAllErrors=true), all step validation errors are displayed', () => {
    const emptyFormData = {};
    const stepValidation = validateStep(0, emptyFormData);

    const displayedErrors = computeDisplayedErrors(
      stepValidation.errors,
      {},
      true // Next / Submit clicked!
    );

    // All required field errors for Step 0 must now be displayed
    expect(displayedErrors.entityName).toBeDefined();
    expect(displayedErrors.entityType).toBeDefined();
    expect(displayedErrors.registrationNumber).toBeDefined();
    expect(displayedErrors.countryOfIncorporation).toBeDefined();
  });

  it('Rule 3: When fields are corrected after Next was clicked, resolved errors are removed', () => {
    // 1. User had clicked Next on empty form
    const step0Invalid = validateStep(0, { entityName: '' });
    const displayedErrorsBefore = computeDisplayedErrors(
      step0Invalid.errors,
      {},
      true
    );
    expect(displayedErrorsBefore.entityName).toBeDefined();

    // 2. User fills in all required fields
    const step0Valid = validateStep(0, {
      entityName: 'Apex Capital Holdings Ltd',
      entityType: 'CORPORATE',
      registrationNumber: '202612345A',
      countryOfIncorporation: 'SG',
    });
    const displayedErrorsAfter = computeDisplayedErrors(
      step0Valid.errors,
      {},
      true
    );
    expect(Object.keys(displayedErrorsAfter).length).toBe(0);
  });

  it('Rule 4: Generic engine required-field errors are filtered while labeled errors stay', () => {
    const normalized = normalizeValidationErrors({
      entityName: 'Legal Entity Name is required.',
      entityType: 'Field is required.',
      registrationNumber: 'Company Registration / Trust Deed No. is required.',
      countryOfIncorporation: 'Field is required.',
      otherField: 'Field is required.',
    });

    expect(Object.keys(normalized)).toEqual(['entityName', 'registrationNumber']);
    expect(normalized.entityName).toBe('Legal Entity Name is required.');
    expect(normalized.registrationNumber).toBe('Company Registration / Trust Deed No. is required.');
  });
});
