import { validateStep, canNavigateToStep } from './schemaValidator';

describe('JSON Schema Step Validator', () => {
  describe('Step 0: Entity Profile & Structure', () => {
    it('fails when Step 0 required fields are missing', () => {
      const invalidData = {};
      const result = validateStep(0, invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.entityName).toBeDefined();
      expect(result.errors.entityType).toBeDefined();
      expect(result.errors.registrationNumber).toBeDefined();
      expect(result.errors.countryOfIncorporation).toBeDefined();
    });

    it('passes when Step 0 standard corporate fields are valid', () => {
      const validCorporateData = {
        entityName: 'Apex Capital Holdings Ltd',
        entityType: 'CORPORATE',
        registrationNumber: '202612345A',
        countryOfIncorporation: 'SG',
      };
      const result = validateStep(0, validCorporateData);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('requires trusteeName when entityType is TRUST (FEEL conditional validation)', () => {
      const incompleteTrustData = {
        entityName: 'The Sterling Family Trust',
        entityType: 'TRUST',
        registrationNumber: 'TR-2026-99',
        countryOfIncorporation: 'SG',
      };
      const result = validateStep(0, incompleteTrustData);

      expect(result.isValid).toBe(false);
      expect(result.errors.trusteeName).toBeDefined();
    });

    it('passes when entityType is TRUST and trusteeName is provided', () => {
      const validTrustData = {
        entityName: 'The Sterling Family Trust',
        entityType: 'TRUST',
        registrationNumber: 'TR-2026-99',
        countryOfIncorporation: 'SG',
        trusteeName: 'Standard Trustees Pte Ltd',
        trustGoverningLaw: 'Singapore Law',
        isRevocableTrust: false,
      };
      const result = validateStep(0, validTrustData);

      expect(result.isValid).toBe(true);
    });

    it('rejects invalid enum values for countryOfIncorporation', () => {
      const invalidCountryData = {
        entityName: 'Apex Capital',
        entityType: 'CORPORATE',
        registrationNumber: '202612345A',
        countryOfIncorporation: 'INVALID_COUNTRY',
      };
      const result = validateStep(0, invalidCountryData);

      expect(result.isValid).toBe(false);
      expect(result.errors.countryOfIncorporation).toContain('must be a valid selection');
    });
  });

  describe('Step 1: Tax & Regulatory Profiling', () => {
    it('passes default tax resident SG without foreign tax info', () => {
      const defaultTaxData = {
        isTaxResidentSG: true,
        isAccreditedInvestor: false,
      };
      const result = validateStep(1, defaultTaxData);

      expect(result.isValid).toBe(true);
    });

    it('requires valid TIN format when isTaxResidentSG is false', () => {
      const nonSGTaxMissingTIN = {
        isTaxResidentSG: false,
        foreignTaxJurisdictions: 'US',
        tinNumber: '',
      };
      const result = validateStep(1, nonSGTaxMissingTIN);

      expect(result.isValid).toBe(false);
      expect(result.errors.tinNumber).toBeDefined();
    });

    it('rejects TIN that fails regex pattern ^[A-Za-z0-9-]{6,20}$', () => {
      const invalidTIN = {
        isTaxResidentSG: false,
        foreignTaxJurisdictions: 'US',
        tinNumber: '123', // too short (< 6 chars)
      };
      const result = validateStep(1, invalidTIN);

      expect(result.isValid).toBe(false);
      expect(result.errors.tinNumber).toBeDefined();
    });

    it('accepts valid foreign TIN format', () => {
      const validForeignTax = {
        isTaxResidentSG: false,
        foreignTaxJurisdictions: 'US',
        tinNumber: 'US-987654321',
        isAccreditedInvestor: true,
        aiQualificationBasis: 'NET_FIN_ASSETS',
      };
      const result = validateStep(1, validForeignTax);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Step 2: Entity Ownership & Relationship Tree', () => {
    it('validates dynamic participants list items', () => {
      const dataWithInvalidParticipant = {
        participants: [
          {
            participantName: '', // Required missing
            participantRole: 'UBO',
            shareholdingPercentage: 150, // Max 100 exceeded
          },
        ],
      };
      const result = validateStep(2, dataWithInvalidParticipant);

      expect(result.isValid).toBe(false);
      expect(result.errors['participants[0].participantName']).toBeDefined();
      expect(result.errors['participants[0].shareholdingPercentage']).toContain('must be at most 100');
    });

    it('passes with valid participant items', () => {
      const validParticipantsData = {
        participants: [
          {
            participantName: 'John Doe',
            participantRole: 'UBO',
            shareholdingPercentage: 60,
          },
          {
            participantName: 'Jane Smith',
            participantRole: 'DIRECTOR',
            shareholdingPercentage: 40,
          },
        ],
      };
      const result = validateStep(2, validParticipantsData);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Stepper Navigation Guard (canNavigateToStep)', () => {
    it('blocks navigation from Step 0 to Step 1 when Step 0 is invalid', () => {
      const invalidStep0Data = { entityName: '' };
      const navResult = canNavigateToStep(1, 0, invalidStep0Data);

      expect(navResult.allowed).toBe(false);
      expect(navResult.blockingStepIndex).toBe(0);
      expect(navResult.errors).toBeDefined();
    });

    it('allows navigation from Step 0 to Step 1 when Step 0 is valid', () => {
      const validStep0Data = {
        entityName: 'Acme Holdings Corp',
        entityType: 'CORPORATE',
        registrationNumber: 'REG-123456',
        countryOfIncorporation: 'SG',
      };
      const navResult = canNavigateToStep(1, 0, validStep0Data);

      expect(navResult.allowed).toBe(true);
    });

    it('blocks direct navigation to Step 2 when Step 0 is incomplete', () => {
      const invalidStep0Data = {};
      const navResult = canNavigateToStep(2, 0, invalidStep0Data);

      expect(navResult.allowed).toBe(false);
      expect(navResult.blockingStepIndex).toBe(0);
    });

    it('blocks direct navigation to Step 2 when Step 0 is valid but Step 1 is invalid', () => {
      const validStep0InvalidStep1 = {
        entityName: 'Acme Holdings Corp',
        entityType: 'CORPORATE',
        registrationNumber: 'REG-123456',
        countryOfIncorporation: 'SG',
        isTaxResidentSG: false, // requires TIN
        tinNumber: '',
      };
      const navResult = canNavigateToStep(2, 0, validStep0InvalidStep1);

      expect(navResult.allowed).toBe(false);
      expect(navResult.blockingStepIndex).toBe(1);
    });

    it('allows direct navigation to Step 2 when both Step 0 and Step 1 are valid', () => {
      const validStep0AndStep1 = {
        entityName: 'Acme Holdings Corp',
        entityType: 'CORPORATE',
        registrationNumber: 'REG-123456',
        countryOfIncorporation: 'SG',
        isTaxResidentSG: true,
        isAccreditedInvestor: false,
      };
      const navResult = canNavigateToStep(2, 0, validStep0AndStep1);

      expect(navResult.allowed).toBe(true);
    });

    it('always allows backward navigation (e.g. from Step 1 to Step 0)', () => {
      const anyData = {};
      const navResult = canNavigateToStep(0, 1, anyData);

      expect(navResult.allowed).toBe(true);
    });

    it('re-blocks navigation when user returns to Step 0 and makes it invalid', () => {
      // 1. Initially valid data
      const validData = {
        entityName: 'Acme Holdings Corp',
        entityType: 'CORPORATE',
        registrationNumber: 'REG-123456',
        countryOfIncorporation: 'SG',
      };
      expect(canNavigateToStep(1, 0, validData).allowed).toBe(true);

      // 2. User goes back to Step 0 and clears entityName
      const modifiedInvalidData = {
        ...validData,
        entityName: '',
      };
      expect(canNavigateToStep(1, 0, modifiedInvalidData).allowed).toBe(false);
    });
  });
});
