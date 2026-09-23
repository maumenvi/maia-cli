import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { agentSupportsTransport } from '../../src/agent/agents/inject/agent.supports.transport.ts';
import { agentRegistry } from '../../src/agent/agents/registry/agent.registry.ts';
import type { AgentTarget } from '../../src/agent/agents/contracts/agent.target.ts';

const ALL_TRANSPORTS = ['stdio', 'http', 'sse', 'ws', 'npx'] as const;

describe('agentSupportsTransport', () => {
  it('returns true for every real AgentTarget and every transport (no restriction declared today)', () => {
    for (const target of agentRegistry) {
      for (const transport of ALL_TRANSPORTS) {
        assert.equal(agentSupportsTransport(target, transport), true, `${target.id} should support ${transport}`);
      }
    }
  });

  it('returns false for a transport outside a test target\'s declared supportedTransports', () => {
    const restrictedTarget = {
      ...agentRegistry[0],
      id: 'test-restricted',
      supportedTransports: ['stdio'] as const,
    } as AgentTarget;

    assert.equal(agentSupportsTransport(restrictedTarget, 'stdio'), true);
    assert.equal(agentSupportsTransport(restrictedTarget, 'http'), false);
  });
});
