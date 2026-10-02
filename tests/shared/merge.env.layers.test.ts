import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeEnvLayers } from '../../src/config/core/merge.env.layers.ts';

const map = (entries: Record<string, string>) => new Map(Object.entries(entries));

describe('mergeEnvLayers', () => {
  it('never overrides a non-empty process value', () => {
    assert.deepEqual(mergeEnvLayers({ X: 'proc' }, map({ X: 'p' }), map({ X: 'g' })), {});
  });

  it('prefers the project over the global file', () => {
    assert.deepEqual(mergeEnvLayers({}, map({ X: 'p' }), map({ X: 'g' })), { X: 'p' });
  });

  it('does not let an empty project entry hide the global value', () => {
    assert.deepEqual(mergeEnvLayers({}, map({ X: '' }), map({ X: 'g' })), { X: 'g' });
  });

  it('fills a variable exported empty in the process', () => {
    assert.deepEqual(mergeEnvLayers({ X: '' }, map({}), map({ X: 'g' })), { X: 'g' });
  });
});
