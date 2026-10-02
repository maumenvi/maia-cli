import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { claude } from '../../src/agent/agents/registry/claude.ts';
import { copilot } from '../../src/agent/agents/registry/copilot.ts';
import { findNativeCommandCollisions } from '../../src/cli/commands/skills/find.native.command.collisions.ts';

describe('findNativeCommandCollisions', () => {
  it('reports agents with a built-in command of the same name', () => {
    assert.deepEqual(findNativeCommandCollisions('security-review', [claude, copilot]), [{ agentName: 'Claude' }]);
    assert.deepEqual(findNativeCommandCollisions('Security-Review', [claude]), [{ agentName: 'Claude' }]);
  });

  it('is empty for other names or agents without native commands', () => {
    assert.deepEqual(findNativeCommandCollisions('sentry-security-review', [claude]), []);
    assert.deepEqual(findNativeCommandCollisions('security-review', [copilot]), []);
  });
});
