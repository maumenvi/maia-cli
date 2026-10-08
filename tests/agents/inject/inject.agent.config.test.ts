import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import type { AgentTarget } from '../../../src/agent/agents/contracts/agent.target.ts';
import { injectAgentConfig } from '../../../src/agent/agents/inject/inject.agent.config.ts';

describe('injectAgentConfig', () => {
  it('reports whether an agent config changed and preserves byte-identical files', () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'maia-inject-config-'));
    const configPath = path.join(directory, '.mcp.json');
    const target: AgentTarget = {
      id: 'test',
      name: 'Test',
      configFormat: 'mcp-servers',
      configPaths: () => [configPath],
      projectDir: 'omit',
    };
    const entries = [{
      key: 'maia',
      config: { command: 'maia', args: ['mcp-server', '--agent', 'test'] },
    }];

    try {
      const created = injectAgentConfig(target, configPath, entries);
      const original = readFileSync(configPath, 'utf8');
      const unchanged = injectAgentConfig(target, configPath, entries);

      assert.deepEqual(created, { configPath, created: true, updated: false, changed: true });
      assert.deepEqual(unchanged, { configPath, created: false, updated: false, changed: false });
      assert.equal(readFileSync(configPath, 'utf8'), original);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
