import schema from '../schema/pb-entity-onboarding-schema.json';

export interface FormSchema extends Record<string, unknown> {
  $schema: string;
  id: string;
  type: string;
  components: unknown[];
}

/**
 * Recursively transforms schema components so that any top-level `hide` FEEL expression
 * is mirrored into `conditional.hide` — the property form-js's ConditionChecker reads.
 *
 * This allows the JSON schema file to use the simpler `"hide": "=expr"` notation
 * while form-js receives `"conditional": { "hide": "=expr" }` as it expects.
 */
function applyHideConditional(component: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...component };

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
    result.components = (result.components as Record<string, unknown>[]).map(applyHideConditional);
  }

  // Recurse into tabs (top-level form layout)
  if (Array.isArray(result.tabs)) {
    result.tabs = (result.tabs as Record<string, unknown>[]).map((tab) => ({
      ...tab,
      components: Array.isArray(tab.components)
        ? (tab.components as Record<string, unknown>[]).map(applyHideConditional)
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
  // Find the tabs component (it might not be at a fixed index)
  const tabsComponent = schema.components?.find((c: any) => c.type === 'tabs');
  
  if (tabsComponent && tabsComponent.tabs) {
    const tabs = tabsComponent.tabs as any[];
    
    if (stepIndex >= 0 && stepIndex < tabs.length) {
      const selectedTab = tabs[stepIndex];
      
      // Transform components: hide → conditional.hide for form-js compatibility
      const transformedComponents = Array.isArray(selectedTab.components)
        ? (selectedTab.components as Record<string, unknown>[]).map(applyHideConditional)
        : [];

      return {
        $schema: schema.$schema,
        id: selectedTab.id,
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
  const tabsComponent = schema.components?.find((c: any) => c.type === 'tabs');
  
  if (tabsComponent && tabsComponent.tabs) {
    const tabs = tabsComponent.tabs as any[];
    return tabs.map((tab: any) => tab.label.split(': ')[1] || tab.label);
  }
  
  return [];
};
