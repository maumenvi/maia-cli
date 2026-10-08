import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../../src/agent/catalog/store/agent.catalog.store.ts';
import { configureAgents } from '../../../src/cli/commands/agent/configure.agents.ts';
import { assertNoAbsolutePath } from '../../support/assert.no.absolute.path.ts';

// Contract reference: https://zed.dev/docs/ai/mcp
describe('Zed registration contract (context_servers)', () => {
  it('writes the documented flat command format', async () => {
    const projectRoot = mkdtempSync(path.join(os.tmpdir(), 'maia-zed-contract-'));
    try {
      await configureAgents(new AgentCatalogStore({ cwd: projectRoot }), ['zed']);
      const text = readFileSync(path.join(projectRoot, '.zed', 'settings.json'), 'utf8');
      assert.deepEqual(JSON.parse(text), {
        context_servers: {
          maia: { command: 'maia', args: ['mcp-server', '--agent', 'zed'] },
        },
      });
      assertNoAbsolutePath(text, { projectRoot, homeDir: os.homedir() });
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
