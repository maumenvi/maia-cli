import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseGuardrailConfig } from '../../src/guardrails/config/parse.guardrail.config.ts';

describe('parseGuardrailConfig', () => {
  it('accepts a well-formed config', () => {
    const result = parseGuardrailConfig({ version: 1, denyPatterns: ['**/*.env'] });
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error('expected ok');
    assert.deepEqual(result.config.denyPatterns, ['**/*.env']);
  });

  it('accepts an empty denyPatterns list', () => {
    const result = parseGuardrailConfig({ version: 1, denyPatterns: [] });
    assert.equal(result.ok, true);
  });

  it('rejects an unknown version', () => {
    const result = parseGuardrailConfig({ version: 2, denyPatterns: [] });
    assert.equal(result.ok, false);
  });

  it('rejects denyPatterns that is not an array of strings', () => {
    assert.equal(parseGuardrailConfig({ version: 1, denyPatterns: 'nope' }).ok, false);
    assert.equal(parseGuardrailConfig({ version: 1, denyPatterns: [1, 2] }).ok, false);
  });

  it('rejects a missing required field', () => {
    assert.equal(parseGuardrailConfig({ denyPatterns: [] }).ok, false);
    assert.equal(parseGuardrailConfig({ version: 1 }).ok, false);
  });

  it('rejects a non-object payload', () => {
    assert.equal(parseGuardrailConfig(null).ok, false);
    assert.equal(parseGuardrailConfig('text').ok, false);
  });

  it('never throws on malformed input', () => {
    assert.doesNotThrow(() => parseGuardrailConfig(undefined));
    assert.doesNotThrow(() => parseGuardrailConfig({ version: {}, denyPatterns: {} }));
  });
});
