import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import type { JsonRpcRequest } from '../../src/agent/mcp/runtime/protocol/json-rpc/json.rpc.request.ts';
import type { JsonRpcResponse } from '../../src/agent/mcp/runtime/protocol/json-rpc/json.rpc.response.ts';
import { McpStdioServer } from '../../src/agent/mcp/server/stdio.ts';

/** Calls the server's request handler directly. */
async function invoke(server: McpStdioServer, request: JsonRpcRequest): Promise<Record<string, unknown>> {
  const handle = Reflect.get(server as object, 'handle') as (req: JsonRpcRequest) => Promise<JsonRpcResponse | null>;
  const response = await handle.call(server, request);
  if (!response || !('result' in response)) throw new Error('Expected a result');
  return response.result as Record<string, unknown>;
}

/** Runs `body` with a project that has speckit pinned in the lock. */
async function withServer(body: (server: McpStdioServer) => Promise<void>, agentId = 'claude'): Promise<void> {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-toolkits-'));
  try {
    const store = new AgentCatalogStore({ cwd: dir });
    store.saveManifest(store.loadManifest());
    store.saveSelectedAgents(['claude']);
    store.setToolkit('speckit', { version: '1.0.11', scope: 'project' });
    store.addDependency('skill', 'maia_toolkits', {
      version: '*', source: 'local', enabled: true, capabilities: [], constraints: [], allowedLlms: ['*'], path: 'skills/x.md',
    });
    store.buildLock();
    const server = new McpStdioServer(store, { agentId, dynamicDiscovery: true });
    await body(server);
    await invoke(server, { jsonrpc: '2.0', id: 99, method: 'shutdown' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('maia_toolkits MCP tool', () => {
  it('is listed for any agent, once, and nothing installs toolkits', async () => {
    for (const agentId of ['claude', 'codex']) {
      await withServer(async (server) => {
        const { tools } = await invoke(server, { jsonrpc: '2.0', id: 1, method: 'tools/list' }) as { tools: Array<{ name: string; inputSchema: unknown }> };
        const matches = tools.filter((tool) => tool.name === 'maia_toolkits');
        assert.equal(matches.length, 1);
        assert.deepEqual(matches[0].inputSchema, {
          type: 'object',
          properties: { name: { type: 'string', description: 'Optional toolkit name to filter' } },
          additionalProperties: false,
        });
        assert.equal(tools.some((tool) => /toolkit/i.test(tool.name) && /install/i.test(tool.name)), false);
      }, agentId);
    }
  });

  it('describes installed toolkits and filters by name', () => withServer(async (server) => {
    const call = async (args: Record<string, unknown>) => invoke(server, {
      jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'maia_toolkits', arguments: args },
    }) as Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

    const all = JSON.parse((await call({})).content[0].text);
    assert.equal(all.note, 'Maia MCP does not install toolkits. Use the CLI command shown or the toolkit docs.');
    assert.deepEqual(all.toolkits[0], {
      name: 'speckit',
      title: 'GitHub Spec Kit',
      description: 'Spec-driven development: specify → plan → tasks → implement',
      docsUrl: 'https://github.github.com/spec-kit/installation.html',
      supportsGlobal: true,
      installed: true,
      version: '1.0.11',
      scope: 'project',
      integrations: ['claude'],
      paths: ['.specify', '.claude/skills/speckit-*'],
      installCommand: 'maia toolkit i speckit',
    });

    assert.equal(JSON.parse((await call({ name: 'speckit' })).content[0].text).toolkits.length, 1);
    const unknown = await call({ name: 'nope' });
    assert.equal(unknown.isError, true);
    assert.match(unknown.content[0].text, /Unknown toolkit "nope"/);
  }));
});
