import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findToolkit } from '../../src/agent/toolkits/catalog/find.toolkit.ts';
import { listToolkitNames } from '../../src/agent/toolkits/catalog/list.toolkit.names.ts';

describe('toolkit catalog', () => {
  it('finds speckit and nothing else', () => {
    assert.equal(findToolkit('speckit')?.title, 'GitHub Spec Kit');
    assert.equal(findToolkit('nope'), undefined);
    assert.deepEqual(listToolkitNames(), ['speckit']);
  });
});
