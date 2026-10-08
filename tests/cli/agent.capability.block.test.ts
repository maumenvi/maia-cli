import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { claude } from '../../src/agent/agents/registry/claude.ts';
import { cline } from '../../src/agent/agents/registry/cline.ts';
import { codex } from '../../src/agent/agents/registry/codex.ts';
import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { renderAgentCapabilityBlock } from '../../src/cli/commands/agent/render.agent.capability.block.ts';

/** Renders the claude block in a fresh project for one registration outcome. */
function render(
  registration: Parameters<typeof renderAgentCapabilityBlock>[2] | ((root: string) => Parameters<typeof renderAgentCapabilityBlock>[2]),
  target = claude,
) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-block-'));
  try {
    const store = new AgentCatalogStore({ cwd: dir });
    store.saveManifest(store.loadManifest());
    store.addDependency('mcp', 'context7', {
      version: '*', source: 'local', enabled: true, capabilities: [], constraints: [],
      allowedLlms: ['*'], vscode: { command: 'ctx', args: [] },
    });
    store.buildLock();
    const resolved = typeof registration === 'function' ? registration(store.getPaths().projectRoot) : registration;
    return renderAgentCapabilityBlock(store, target, resolved);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('capability block (FR-005)', () => {
  it('names the file the proxy was registered in', () => {
    const block = render((root) => ({ status: 'registered', configPath: path.join(root, '.mcp.json') }));
    assert.match(block, /registered for this agent in `\.mcp\.json`/);
    assert.match(block, /- `maia` — aggregating proxy/);
    assert.match(block, /- `context7`/);
  });

  it('never claims a registration that did not happen', () => {
    const block = render({ status: 'skipped', reason: 'this project is local-only' });
    assert.match(block, /No MCP server is registered for this agent: this project is local-only/);
    assert.match(block, /- _not registered_/);
    assert.doesNotMatch(block, /registered for this agent in/);
    assert.doesNotMatch(block, /- `context7`/);
  });

  it('renders pending Cline manual guidance without persisting a project path', () => {
    const block = render((root) => ({
      status: 'pending',
      reason: 'Cline reads MCP servers only from its global settings',
      manualStep: `Add {"MAIA_PROJECT_DIR":"${root}"}`,
    }), cline);

    assert.match(block, /No MCP server is registered for this agent yet/);
    assert.match(block, /<absolute path of this project>/);
    assert.doesNotMatch(block, /MAIA_PROJECT_DIR.*maia-block-/);
  });

  it('includes Codex trusted-project guidance in registered instructions', () => {
    const block = render({ status: 'registered', configPath: '/tmp/project/.codex/config.toml' }, codex);
    assert.match(block, /Codex applies \.codex\/config\.toml only in trusted projects/);
  });
});
