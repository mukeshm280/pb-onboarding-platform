import { getStepSchema, getStepLabels } from '../utils/schemaBuilder';

describe('Schema Builder', () => {
  it('should extract step labels from schema', () => {
    const labels = getStepLabels();
    console.log('Step Labels:', labels);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels).toContain('Entity Profile & Structure');
  });

  it('should generate schema for step 0', () => {
    const schema = getStepSchema(0);
    console.log('Step 0 Schema:', schema);
    expect(schema.id).toBe('tab_entity_profile');
    expect(schema.components?.length).toBeGreaterThan(0);
  });

  it('should generate schema for step 1', () => {
    const schema = getStepSchema(1);
    console.log('Step 1 Schema:', schema);
    expect(schema.id).toBe('tab_tax_regulatory');
    expect(schema.components?.length).toBeGreaterThan(0);
  });

  it('should generate schema for step 2', () => {
    const schema = getStepSchema(2);
    console.log('Step 2 Schema:', schema);
    expect(schema.id).toBe('tab_ownership_tree');
    expect(schema.components?.length).toBeGreaterThan(0);
  });
});
