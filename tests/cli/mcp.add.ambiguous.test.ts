import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { mcpCommand } from '../../src/cli/commands/mcp/mcp.command.ts';
import { fakeInteraction } from '../support/fake.interaction.ts';

/** Two registry servers whose names share the "context" prefix. */
function registryResponse(): Response {
  const server = (name: string) => ({
    server: {
      name,
      title: name,
      description: `${name} server`,
      version: '1.0.0',
      packages: [{ registryType: 'npm', identifier: `@example/${name.replace('/', '-')}`, version: '1.0.0', transport: { type: 'stdio' } }],
    },
  });
  return Response.json({ servers: [server('io.example/context7'), server('io.example/context7fork')] });
}

/** Runs one mcp command against the fake registry in a fresh project. */
async function run(args: string[], interaction = fakeInteraction()) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-ambiguous-'));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => registryResponse()) as typeof fetch;
  try {
    const store = new AgentCatalogStore({ cwd: tempDir });
    store.saveManifest(store.loadManifest());
    let error: Error | undefined;
    try {
      await mcpCommand(args, { store, interaction });
    } catch (caught) {
      error = caught as Error;
    }
    return { error, mcps: Object.keys(store.loadManifest().mcps) };
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(tempDir, { recursive: true, force: true });
  }
}

describe('maia mcp add', () => {
  it('fails without a terminal on an ambiguous name and lists the canonical names', async () => {
    const { error, mcps } = await run(['add', 'context']);
    assert.match(error?.message ?? '', /"context" matches several catalog entries/);
    assert.match(error?.message ?? '', /io\.example\/context7\n/);
    assert.match(error?.message ?? '', /io\.example\/context7fork/);
    assert.deepEqual(mcps, []);
  });

  it('installs an exact canonical name directly', async () => {
    const { error, mcps } = await run(['add', 'io.example/context7']);
    assert.equal(error, undefined);
    assert.deepEqual(mcps, ['io.example/context7']);
  });

  it('lets the user choose on a terminal', async () => {
    const { mcps } = await run(['add', 'context'], fakeInteraction({ interactive: true, choose: 2 }));
    assert.deepEqual(mcps, ['io.example/context7fork']);
  });
});
