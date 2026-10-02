import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CatalogSearchResult } from '../../src/agent/catalog/providers/contracts/catalog.search.result.ts';
import type { MCPConfig } from '../../src/agent/tools/contracts/mcp.config.ts';
import { extractCredentialEnvHints } from '../../src/cli/shared/select/extract.credential.env.hints.ts';
import { selectCatalogResult } from '../../src/cli/shared/select/select.catalog.result.ts';

function mcpResult(vscode: MCPConfig): CatalogSearchResult {
  return {
    id: 'example/mcp',
    kind: 'mcp',
    name: 'example/mcp',
    displayName: 'Example MCP',
    provider: 'mcp',
    source: 'https://example.com/repo',
    install: { type: 'mcp', vscode },
  };
}

describe('extractCredentialEnvHints', () => {
  it('returns credential env vars from npx env map', () => {
    const result = mcpResult({
      transport: 'npx',
      package: '@example/server',
      env: {
        WORKSPACE_ROOT: '${env:WORKSPACE_ROOT}',
        API_KEY: '${env:API_KEY}',
      },
    });

    assert.deepEqual(extractCredentialEnvHints(result), ['API_KEY']);
  });

  it('returns credential env vars from HTTP headers placeholders', () => {
    const result = mcpResult({
      transport: 'http',
      url: 'https://example.com/mcp',
      headers: {
        Authorization: 'Bearer ${env:GITHUB_TOKEN}',
        'X-Project': '${env:PROJECT_ID}',
      },
    });

    assert.deepEqual(extractCredentialEnvHints(result), ['GITHUB_TOKEN']);
  });

  it('returns empty list for skills', () => {
    const result: CatalogSearchResult = {
      id: 'vercel/skill',
      kind: 'skill',
      name: 'react',
      displayName: 'React',
      provider: 'skills',
      source: 'vercel-labs/agent-skills',
      install: { type: 'github', repository: 'vercel-labs/agent-skills', skill: 'react' },
    };

    assert.deepEqual(extractCredentialEnvHints(result), []);
  });
});

describe('selectCatalogResult', () => {
  const results: CatalogSearchResult[] = [
    { ...mcpResult({ command: 'a' }), id: 'a', name: 'a', displayName: 'Alpha' },
    { ...mcpResult({ command: 'b' }), id: 'b', name: 'b', displayName: 'Beta' },
  ];

  async function run(answers: string[]): Promise<{ selected: CatalogSearchResult | null; output: string[] }> {
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => { output.push(args.join(' ')); };
    try {
      const selected = await selectCatalogResult(results, {
        trustOf: (result) => result.id === 'a',
        questionFn: async () => answers.shift() ?? '0',
      });
      return { selected, output };
    } finally {
      console.log = originalLog;
    }
  }

  it('labels each option with the trust of its source', async () => {
    const { output } = await run(['0']);
    assert.ok(output.some((line) => line.startsWith('1) Alpha') && line.includes('[trusted]')));
    assert.ok(output.some((line) => line.startsWith('2) Beta') && line.includes('[untrusted]')));
  });

  it('returns null on cancel and the chosen result otherwise', async () => {
    assert.equal((await run(['0'])).selected, null);
    assert.equal((await run(['9', '2'])).selected?.id, 'b');
  });
});
