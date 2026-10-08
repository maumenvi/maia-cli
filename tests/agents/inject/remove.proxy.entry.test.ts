import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { removeProxyEntry } from '../../../src/agent/agents/inject/remove.proxy.entry.ts';

describe('removeProxyEntry', () => {
  it('removes only the Maia server from the selected MCP servers map', () => {
    assert.deepEqual(
      removeProxyEntry({
        servers: { maia: { command: 'old' }, other: { command: 'other' } },
        mcpServers: { maia: { command: 'keep' } },
      }, 'servers'),
      {
        servers: { other: { command: 'other' } },
        mcpServers: { maia: { command: 'keep' } },
      },
    );
  });

  it('retains an empty MCP registry after removing its Maia entry', () => {
    assert.deepEqual(
      removeProxyEntry({ mcpServers: { maia: { command: 'old' } } }, 'mcp-servers'),
      { mcpServers: {} },
    );
  });

  it('removes only the Maia context server from Zed settings', () => {
    assert.deepEqual(
      removeProxyEntry({
        context_servers: { maia: { command: 'old' }, other: { command: 'other' } },
      }, 'zed-settings'),
      { context_servers: { other: { command: 'other' } } },
    );
  });
});
