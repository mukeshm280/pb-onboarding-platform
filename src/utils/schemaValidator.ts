import { evaluate } from "@bpmn-io/feelin";
import schema from "../schema/pb-entity-onboarding-schema.json";

export interface FormValidationRule {
  required?: boolean;
  pattern?: string;
  patternErrorMessage?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

export interface FormComponent {
  id?: string;
  key?: string;
  label?: string;
  type?: string;
  hide?: string;
  defaultValue?: unknown;
  validate?: FormValidationRule;
  values?: Array<{ label: string; value: string }>;
  components?: FormComponent[];
}

export interface StepValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Evaluates a FEEL expression against the current form data context.
 * Used for dynamic conditional field/group visibility (the `hide` attribute).
 */
export function isComponentHidden(
  hideExpression: string | undefined,
  formData: Record<string, unknown>,
): boolean {
  if (!hideExpression) {
    return false;
  }

  try {
    // Strip leading '=' if present (Camunda / form-js FEEL convention)
    const expression = hideExpression.startsWith("=")
      ? hideExpression.slice(1).trim()
      : hideExpression.trim();

    const result = evaluate(expression, formData);
    const value = result?.value;

    if (typeof value !== "boolean") {
      return false;
    }

    return value;
  } catch (err) {
    console.warn(
      `Failed to evaluate FEEL expression "${hideExpression}":`,
      err,
    );
    return false;
  }
}

/**
 * Validates a single field component based on its JSON Schema constraints.
 */
export function validateField(
  component: FormComponent,
  value: unknown,
  _formData?: Record<string, unknown>,
): string | null {
  const { validate, type, label, key, values } = component;
  const fieldName = label || key || "Field";
  console.log("validateField called with:", { component, value, _formData });
  if (!validate && !values) {
    return null;
  }

  // 1. Required validation
  if (validate?.required) {
    if (type === "checkbox") {
      if (value !== true) {
        return `${fieldName} is required.`;
      }
    } else if (type === "number") {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        isNaN(Number(value))
      ) {
        return `${fieldName} is required.`;
      }
    } else if (type === "dynamiclist") {
      if (!Array.isArray(value) || value.length === 0) {
        return `At least one ${fieldName.toLowerCase()} is required.`;
      }
    } else {
      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
      ) {
        return `${fieldName} is required.`;
      }
    }
  }

  // If value is empty and not required, skip format/pattern/range checks
  const isUnset =
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value === "string" && value.trim() === "");
  if (isUnset) {
    return null;
  }

  // 2. Select enum validation
  if (values && values.length > 0) {
    const validValues = values.map((v) => v.value);
    if (!validValues.includes(String(value))) {
      return `${fieldName} must be a valid selection.`;
    }
  }

  // 3. Pattern / Regex validation
  if (validate?.pattern) {
    const regex = new RegExp(validate.pattern);
    if (!regex.test(String(value))) {
      return (
        validate.patternErrorMessage ||
        `${fieldName} does not match the required format.`
      );
    }
  }

  // 4. Min / Max numeric range validation
  if (type === "number" || typeof value === "number") {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return `${fieldName} must be a valid number.`;
    }
    if (validate?.min !== undefined && numValue < validate.min) {
      return `${fieldName} must be at least ${validate.min}.`;
    }
    if (validate?.max !== undefined && numValue > validate.max) {
      return `${fieldName} must be at most ${validate.max}.`;
    }
  }

  // 5. MinLength / MaxLength string validation
  if (typeof value === "string") {
    if (
      validate?.minLength !== undefined &&
      value.trim().length < validate.minLength
    ) {
      return `${fieldName} must have at least ${validate.minLength} characters.`;
    }
    if (
      validate?.maxLength !== undefined &&
      value.trim().length > validate.maxLength
    ) {
      return `${fieldName} must have at most ${validate.maxLength} characters.`;
    }
  }

  return null;
}

/**
 * Recursively extracts and validates all components in a component tree for a step.
 */
export function validateComponents(
  components: FormComponent[],
  formData: Record<string, unknown>,
  errors: Record<string, string> = {},
): Record<string, string> {
  for (const component of components) {
    // Check conditional visibility
    if (isComponentHidden(component.hide, formData)) {
      continue;
    }

    // Handle group container
    if (component.type === "group" && Array.isArray(component.components)) {
      validateComponents(component.components, formData, errors);
      continue;
    }

    // Handle dynamiclist container
    if (component.type === "dynamiclist") {
      const listKey = component.key;
      const listValue = listKey ? (formData[listKey] as unknown[]) : undefined;

      if (
        component.validate?.required &&
        (!Array.isArray(listValue) || listValue.length === 0)
      ) {
        if (listKey) {
          errors[listKey] =
            `At least one ${component.label || listKey} is required.`;
        }
      }

      if (Array.isArray(listValue) && Array.isArray(component.components)) {
        listValue.forEach((item, index) => {
          if (typeof item === "object" && item !== null) {
            const itemRecord = item as Record<string, unknown>;
            for (const childComponent of component.components || []) {
              if (childComponent.key) {
                const childValue = itemRecord[childComponent.key];
                const error = validateField(
                  childComponent,
                  childValue,
                  itemRecord,
                );
                if (error) {
                  errors[`${listKey}[${index}].${childComponent.key}`] =
                    `Row ${index + 1}: ${error}`;
                }
              }
            }
          }
        });
      }
      continue;
    }

    // Handle regular field
    if (component.key) {
      const value = formData[component.key];
      const error = validateField(component, value, formData);
      if (error) {
        errors[component.key] = error;
      }
    }
  }

  return errors;
}

/**
 * Validates all schema fields for a given step index against the provided form data.
 */
interface SchemaTabDefinition {
  id?: string;
  components?: FormComponent[];
}

interface TabsSchemaDefinition {
  type?: string;
  tabs?: SchemaTabDefinition[];
}

export function validateStep(
  stepIndex: number,
  formData: Record<string, unknown>,
): StepValidationResult {
  const tabsComponent = schema.components?.find(
    (component) =>
      typeof component === "object" &&
      component !== null &&
      "type" in component &&
      component.type === "tabs",
  ) as TabsSchemaDefinition | undefined;

  if (
    !tabsComponent?.tabs ||
    stepIndex < 0 ||
    stepIndex >= tabsComponent.tabs.length
  ) {
    return { isValid: true, errors: {} };
  }

  const selectedTab = tabsComponent.tabs[stepIndex];
  const components = selectedTab.components || [];
  const errors = validateComponents(components, formData);

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Determines whether a target step can be navigated to from the current step.
 * Returns true only if all preceding steps [0 .. targetStep - 1] are currently valid.
 */
export function canNavigateToStep(
  targetStep: number,
  currentStep: number,
  formData: Record<string, unknown>,
): {
  allowed: boolean;
  blockingStepIndex?: number;
  errors?: Record<string, string>;
} {
  // Backwards navigation or staying on same step is always allowed
  if (targetStep <= currentStep) {
    return { allowed: true };
  }

  // Validate all prerequisite steps leading up to targetStep
  for (let i = 0; i < targetStep; i++) {
    const { isValid, errors } = validateStep(i, formData);
    if (!isValid) {
      return {
        allowed: false,
        blockingStepIndex: i,
        errors,
      };
    }
  }

  return { allowed: true };
}
