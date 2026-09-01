import schema from '../schema/pb-entity-onboarding-schema.json';

interface SchemaTab {
  id?: string;
  label?: string;
  components?: SchemaComponent[];
}

interface SchemaComponent extends Record<string, unknown> {
  type?: string;
  id?: string;
  label?: string;
  components?: SchemaComponent[];
  tabs?: SchemaTab[];
  hide?: string;
  conditional?: Record<string, unknown>;
}

export interface FormSchema extends Record<string, unknown> {
  $schema: string;
  id: string;
  type: string;
  components: unknown[];
}

const isSchemaComponent = (value: unknown): value is SchemaComponent =>
  typeof value === 'object' && value !== null;

/**
 * Recursively transforms schema components so that top-level `hide` FEEL expressions
 * are mirrored into `conditional.hide` — the property form-js's ConditionChecker reads.
 *
 * This allows the JSON schema file to use the simpler `"hide": "=expr"` notation
 * while form-js receives `"conditional": { "hide": "=expr" }` as it expects.
 */
function applyHideConditional(component: SchemaComponent): SchemaComponent {
  const result: SchemaComponent = { ...component };

  // If this component has a top-level `hide` expression, inject conditional.hide
  if (typeof result.hide === 'string' && result.hide.length > 0) {
    result.conditional = {
      ...(typeof result.conditional === 'object' && result.conditional !== null
        ? (result.conditional as Record<string, unknown>)
        : {}),
      hide: result.hide,
    };
  }

  // Recurse into children
  if (Array.isArray(result.components)) {
    result.components = result.components.map(applyHideConditional);
  }

  // Recurse into tabs (top-level form layout)
  if (Array.isArray(result.tabs)) {
    result.tabs = result.tabs.map((tab) => ({
      ...tab,
      components: Array.isArray(tab.components)
        ? tab.components.map(applyHideConditional)
        : tab.components,
    }));
  }

  return result;
}

/**
 * Extracts form schema for a specific step/tab, and applies hide → conditional.hide
 * transformation so form-js renders field visibility correctly.
 *
 * Step 0 = Entity Profile
 * Step 1 = Tax & Regulatory
 * Step 2 = Ownership Tree
 */
export const getStepSchema = (stepIndex: number): FormSchema => {
  const tabsComponent = schema.components?.find(
    (component) => isSchemaComponent(component) && component.type === 'tabs',
  ) as { type?: string; tabs?: SchemaTab[] } | undefined;

  if (tabsComponent?.tabs) {
    const tabs = tabsComponent.tabs;

    if (stepIndex >= 0 && stepIndex < tabs.length) {
      const selectedTab = tabs[stepIndex];

      // Transform components: hide → conditional.hide for form-js compatibility
      const transformedComponents = Array.isArray(selectedTab.components)
        ? selectedTab.components.map(applyHideConditional)
        : [];

      return {
        $schema: schema.$schema,
        id: selectedTab.id ?? 'default',
        type: 'default',
        components: transformedComponents,
      };
    }
  }

  return {
    $schema: schema.$schema,
    id: 'default',
    type: 'default',
    components: [],
  };
};

/**
 * Gets all step labels for the stepper
 */
export const getStepLabels = (): string[] => {
  const tabsComponent = schema.components?.find(
    (component) => isSchemaComponent(component) && component.type === 'tabs',
  ) as { type?: string; tabs?: SchemaTab[] } | undefined;

  if (tabsComponent?.tabs) {
    return tabsComponent.tabs.map((tab) => {
      const label = typeof tab.label === 'string' ? tab.label : '';
      return label.includes(': ') ? label.split(': ')[1] : label || 'Untitled Step';
    });
  }

  return [];
};
