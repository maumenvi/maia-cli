import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import type { CatalogSearchResult } from '../../src/agent/catalog/providers/contracts/catalog.search.result.ts';
import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { configureMcpCredentialsFromResult } from '../../src/cli/install/mcp-credentials/configure.mcp.credentials.from.result.ts';
import { ensureLockMcpEnvFileEntries } from '../../src/cli/install/mcp-credentials/ensure.lock.mcp.env.file.entries.ts';

const RESULT: CatalogSearchResult = {
  id: 'io.example/tokened',
  kind: 'mcp',
  name: 'io.example/tokened',
  displayName: 'Tokened',
  provider: 'mcp',
  source: 'registry',
  install: { type: 'mcp', vscode: { transport: 'npx', package: '@example/tokened', env: { X_TOKEN: '${env:X_TOKEN}' } } },
};

/** Runs `fn` with an isolated project and global config home, returning both env files. */
async function withEnv(fn: (store: AgentCatalogStore) => Promise<void> | void, globalContent?: string) {
  const project = mkdtempSync(path.join(os.tmpdir(), 'maia-cred-project-'));
  const configHome = mkdtempSync(path.join(os.tmpdir(), 'maia-cred-global-'));
  const previousHome = process.env.MAIA_CONFIG_HOME;
  const previousToken = process.env.X_TOKEN;
  const originalLog = console.log;
  const output: string[] = [];
  console.log = (...args: unknown[]) => { output.push(args.join(' ')); };
  try {
    process.env.MAIA_CONFIG_HOME = configHome;
    delete process.env.X_TOKEN;
    if (globalContent !== undefined) writeFileSync(path.join(configHome, 'mcp.env'), globalContent);
    const store = new AgentCatalogStore({ cwd: project });
    store.saveManifest(store.loadManifest());
    await fn(store);
    const read = (file: string) => (existsSync(file) ? readFileSync(file, 'utf8') : '');
    return {
      projectEnv: read(store.getPaths().mcpEnv),
      globalEnv: read(path.join(configHome, 'mcp.env')),
      output,
    };
  } finally {
    console.log = originalLog;
    if (previousHome === undefined) delete process.env.MAIA_CONFIG_HOME;
    else process.env.MAIA_CONFIG_HOME = previousHome;
    if (previousToken === undefined) delete process.env.X_TOKEN;
    else process.env.X_TOKEN = previousToken;
    rmSync(project, { recursive: true, force: true });
    rmSync(configHome, { recursive: true, force: true });
  }
}

describe('MCP credentials with --env-g (FR-017, FR-019)', () => {
  it('writes the requested credential to the global file, not the project', async () => {
    const { projectEnv, globalEnv, output } = await withEnv((store) => configureMcpCredentialsFromResult(store, RESULT, 'global'));
    assert.match(globalEnv, /^X_TOKEN=/m);
    assert.doesNotMatch(projectEnv, /X_TOKEN/);
    assert.ok(output.some((line) => line.includes('in the global Maia env')));
  });

  it('does not ask for nor stub a credential the global file already has', async () => {
    const { projectEnv, output } = await withEnv((store) => configureMcpCredentialsFromResult(store, RESULT), 'X_TOKEN=g\n');
    assert.doesNotMatch(projectEnv, /X_TOKEN/);
    assert.ok(!output.some((line) => line.includes('may require specific credentials')));
  });

  it('maia i/ci never add an empty project placeholder for a global value', async () => {
    const { projectEnv } = await withEnv((store) => {
      store.addDependency('mcp', 'io.example/tokened', {
        version: '*', source: 'local', enabled: true, capabilities: [], constraints: [], allowedLlms: ['*'],
        vscode: RESULT.install.type === 'mcp' ? RESULT.install.vscode : { command: 'x' },
      });
      ensureLockMcpEnvFileEntries(store, store.buildLock());
    }, 'X_TOKEN=g\n');
    assert.doesNotMatch(projectEnv, /X_TOKEN/);
  });

  it('says nothing was written when --env-g is used for an MCP without credentials', async () => {
    const plain: CatalogSearchResult = { ...RESULT, install: { type: 'mcp', vscode: { command: 'plain' } } };
    const { globalEnv, output } = await withEnv((store) => configureMcpCredentialsFromResult(store, plain, 'global'));
    assert.equal(globalEnv, '');
    assert.ok(output.some((line) => line.includes('requires no credentials; nothing was written')));
  });
});
