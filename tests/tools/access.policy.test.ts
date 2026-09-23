import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canLlmAccessResource } from '../../src/agent/access/policy/can.llm.access.resource.ts';
import { normalizeLlmAccessPolicy } from '../../src/agent/access/policy/normalize.llm.access.policy.ts';
import { resolveAllowedLlms } from '../../src/agent/access/policy/resolve.allowed.llms.ts';

describe('access policy', () => {
  it('preserves explicit empty allow-lists as deny-all', () => {
    assert.deepEqual(resolveAllowedLlms([], 'deny'), []);
    assert.deepEqual(normalizeLlmAccessPolicy({ tools: [], skills: [], mcps: [] }), {
      tools: [],
      skills: [],
      mcps: [],
    });
    assert.equal(canLlmAccessResource(undefined, 'mcp', 'server-a', undefined, [], 'deny'), false);
    assert.equal(canLlmAccessResource('model-x', 'mcp', 'server-a', { mcps: [] }, [], 'deny'), false);
  });
});
