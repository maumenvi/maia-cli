import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { mcpCommand } from '../../src/cli/commands/mcp/mcp.command.ts';
import { fakeInteraction } from '../support/fake.interaction.ts';

/** One registry server that needs X_TOKEN. */
function registryResponse(): Response {
  return Response.json({
    servers: [{
      server: {
        name: 'io.example/tokened',
        title: 'Tokened',
        description: 'Needs a token',
        version: '1.0.0',
        packages: [{
          registryType: 'npm',
          identifier: '@example/tokened',
          version: '1.0.0',
          transport: { type: 'stdio' },
          environmentVariables: [{ name: 'X_TOKEN', isRequired: true, isSecret: true }],
        }],
      },
    }],
  });
}

/** Runs one mcp command in an isolated project and global config home. */
async function run(args: string[]) {
  const project = mkdtempSync(path.join(os.tmpdir(), 'maia-envg-project-'));
  const configHome = mkdtempSync(path.join(os.tmpdir(), 'maia-envg-global-'));
  const previousHome = process.env.MAIA_CONFIG_HOME;
  const previousToken = process.env.X_TOKEN;
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  console.log = () => {};
  globalThis.fetch = (async () => registryResponse()) as typeof fetch;
  try {
    process.env.MAIA_CONFIG_HOME = configHome;
    delete process.env.X_TOKEN;
    const store = new AgentCatalogStore({ cwd: project });
    store.saveManifest(store.loadManifest());
    await mcpCommand(args, { store, interaction: fakeInteraction({ choose: 1 }) });
    const read = (file: string) => (existsSync(file) ? readFileSync(file, 'utf8') : '');
    return {
      mcps: Object.keys(store.loadManifest().mcps),
      projectEnv: read(store.getPaths().mcpEnv),
      globalEnv: read(path.join(configHome, 'mcp.env')),
    };
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    if (previousHome === undefined) delete process.env.MAIA_CONFIG_HOME;
    else process.env.MAIA_CONFIG_HOME = previousHome;
    if (previousToken === undefined) delete process.env.X_TOKEN;
    else process.env.X_TOKEN = previousToken;
    rmSync(project, { recursive: true, force: true });
    rmSync(configHome, { recursive: true, force: true });
  }
}

describe('maia mcp i/find with --env-g (FR-017, FR-020)', () => {
  it('mcp i is an alias of add and -env-g writes credentials globally', async () => {
    const { mcps, projectEnv, globalEnv } = await run(['i', 'io.example/tokened', '-env-g']);
    assert.deepEqual(mcps, ['io.example/tokened']);
    assert.match(globalEnv, /^\w*X_TOKEN=/m);
    assert.doesNotMatch(projectEnv, /X_TOKEN/);
  });

  it('mcp find --env-g keeps the flag out of the query and writes globally', async () => {
    const { mcps, globalEnv } = await run(['find', 'tokened', '--env-g']);
    assert.deepEqual(mcps, ['io.example/tokened']);
    assert.match(globalEnv, /^\w*X_TOKEN=/m);
  });

  it('without --env-g credentials stay in the project', async () => {
    const { projectEnv, globalEnv } = await run(['add', 'io.example/tokened']);
    assert.match(projectEnv, /^\w*X_TOKEN=/m);
    assert.equal(globalEnv, '');
  });
});
