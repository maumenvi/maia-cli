import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { installCommand } from '../../src/cli/commands/install/install.command.ts';
import { discoverMcpsFromStore } from '../../src/cli/commands/mcp/discover.mcps.from.store.ts';
import { installCatalogResult } from '../../src/cli/install/external/install.catalog.result.ts';
import { migrateLegacyMcpEnvFile } from '../../src/cli/install/mcp-credentials/migrate.legacy.mcp.env.file.ts';
import { ensureMcpEnvFile } from '../../src/config/core/ensure.mcp.env.file.ts';
import { loadMcpEnvFromCurrentProject } from '../../src/config/core/load.mcp.env.from.current.project.ts';

function registryResponse(): Response {
  return Response.json({
    servers: [{
      server: {
        name: 'io.github.example/filesystem',
        title: 'Filesystem',
        description: 'Secure filesystem operations.',
        version: '1.2.3',
        repository: { url: 'https://github.com/example/filesystem' },
        packages: [{
          registryType: 'npm',
          identifier: '@example/mcp-filesystem',
          version: '1.2.3',
          transport: { type: 'stdio' },
          runtimeArguments: [{ type: 'positional', value: '-y' }],
          environmentVariables: [
            { name: 'WORKSPACE_ROOT', isRequired: true },
            { name: 'API_KEY', description: 'API key from Example dashboard', isRequired: true, isSecret: true },
          ],
        }],
        remotes: [{
          type: 'sse',
          url: 'https://example.com/mcp',
          headers: [
            { name: 'AUTHORIZATION', description: 'Bearer token for Example', isRequired: true, isSecret: true },
          ],
        }],
      },
    }],
  });
}

describe('MCP Registry provider', () => {
  it('normalizes an npm MCP into Maia state without creating unselected agent config', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-registry-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          'https://registry.modelcontextprotocol.io/v0.1/servers?search=filesystem&version=latest&limit=20',
        );
        return registryResponse();
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      const results = await discoverMcpsFromStore(store, 'filesystem');
      assert.equal(results.length, 1);
      assert.equal(results[0]?.version, '1.2.3');
      assert.deepEqual(results[0]?.credentials, [{
        name: 'API_KEY',
        envName: 'FILESYSTEM_API_KEY',
        description: 'API key from Example dashboard',
        sourceUrl: 'https://github.com/example/filesystem',
      }, {
        name: 'AUTHORIZATION',
        envName: 'FILESYSTEM_AUTHORIZATION',
        description: 'Bearer token for Example',
        sourceUrl: 'https://github.com/example/filesystem',
      }]);

      await installCatalogResult(store, results[0]);

      const lock = store.loadLock();
      const installed = lock?.packages['mcp:io.github.example/filesystem'];
      assert.equal(installed?.source, 'mcp');
      assert.equal(installed?.vscode?.transport, 'npx');
      assert.equal(lock?.sources.mcp?.type, 'registry');

      const vscodeFile = path.resolve(tempDir, '.vscode', 'mcp.json');
      assert.equal(existsSync(vscodeFile), false);
      const envFile = path.resolve(tempDir, '.maia', 'mcp.env');
      assert.ok(existsSync(envFile));
      const envContent = readFileSync(envFile, 'utf8');
      assert.match(envContent, /FILESYSTEM_API_KEY=""/);
      assert.match(envContent, /FILESYSTEM_AUTHORIZATION=""/);
      assert.doesNotMatch(envContent, /^AUTHORIZATION=""/m);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps searching when the registry response takes longer than the short network delay', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-registry-slow-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        await new Promise((resolve) => setTimeout(resolve, 8_100));
        return registryResponse();
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      const results = await discoverMcpsFromStore(store, 'filesystem');
      assert.equal(results.length, 1);
      assert.equal(results[0]?.name, 'io.github.example/filesystem');
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('does not create mcp.env while loading project configuration', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-dotenv-bootstrap-'));
    const originalCwd = process.cwd();

    try {
      process.chdir(tempDir);
      const envFile = path.resolve(tempDir, '.maia', 'mcp.env');
      assert.ok(!existsSync(envFile));
      assert.ok(!existsSync(path.resolve(tempDir, '.env')));

      loadMcpEnvFromCurrentProject();

      assert.equal(existsSync(envFile), false);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('loads only .maia/mcp.env and ignores the project .env', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-isolated-env-'));
    const originalCwd = process.cwd();
    const previousProjectValue = process.env.PROJECT_ONLY_SECRET;
    const previousMcpValue = process.env.MCP_ONLY_SECRET;

    try {
      process.chdir(tempDir);
      mkdirSync(path.resolve(tempDir, '.maia'), { recursive: true });
      writeFileSync(path.resolve(tempDir, '.env'), 'PROJECT_ONLY_SECRET=project\n', 'utf8');
      writeFileSync(path.resolve(tempDir, '.maia', 'mcp.env'), 'MCP_ONLY_SECRET=mcp\n', 'utf8');
      delete process.env.PROJECT_ONLY_SECRET;
      delete process.env.MCP_ONLY_SECRET;

      loadMcpEnvFromCurrentProject();

      assert.equal(process.env.PROJECT_ONLY_SECRET, undefined);
      assert.equal(process.env.MCP_ONLY_SECRET, 'mcp');
    } finally {
      process.chdir(originalCwd);
      if (previousProjectValue === undefined) delete process.env.PROJECT_ONLY_SECRET;
      else process.env.PROJECT_ONLY_SECRET = previousProjectValue;
      if (previousMcpValue === undefined) delete process.env.MCP_ONLY_SECRET;
      else process.env.MCP_ONLY_SECRET = previousMcpValue;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('migrates legacy .env.maia values into the isolated MCP env file', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-legacy-env-'));
    const target = path.resolve(tempDir, '.maia', 'mcp.env');
    try {
      writeFileSync(path.resolve(tempDir, '.env.maia'), 'LEGACY_MCP_TOKEN=secret\n', 'utf8');

      migrateLegacyMcpEnvFile(tempDir, target);

      assert.equal(existsSync(path.resolve(tempDir, '.env.maia')), false);
      assert.match(readFileSync(target, 'utf8'), /^LEGACY_MCP_TOKEN="secret"$/m);
      assert.equal(statSync(target).mode & 0o777, 0o600);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps custom entries and removes legacy autogenerated defaults', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-dotenv-merge-'));
    const envFile = path.resolve(tempDir, '.maia', 'mcp.env');
    mkdirSync(path.dirname(envFile), { recursive: true });
    writeFileSync(
      envFile,
      [
        'SKILLS_REGISTRY_URL=https://skills.sh',
        'NODE_ENV=development',
        'CUSTOM_VALUE=ok',
        'RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION="secret"',
      ].join('\n'),
      'utf8',
    );

    ensureMcpEnvFile(envFile);
    const { ensureLockMcpEnvFileEntries } = await import('../../src/cli/install/mcp-credentials/ensure.lock.mcp.env.file.entries.ts');
    const store = new AgentCatalogStore({ cwd: tempDir });
    ensureLockMcpEnvFileEntries(store, {
      name: 'fixture',
      lockfileVersion: 1,
      sources: {},
      packages: {},
    });

    const content = readFileSync(envFile, 'utf8');
    assert.doesNotMatch(content, /^SKILLS_REGISTRY_URL=https:\/\/skills\.sh$/m);
    assert.doesNotMatch(content, /^NODE_ENV=development$/m);
    assert.match(content, /^CUSTOM_VALUE=ok$/m);
    assert.match(content, /^RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION="secret"$/m);
  });

  it('persists referenced env placeholders from any installed MCP config', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-env-bootstrap-'));
    const store = new AgentCatalogStore({ cwd: tempDir });

    try {
      const config = {
        transport: 'http' as const,
        url: 'https://server.smithery.ai/@renCosta2025/context7fork/mcp',
        headers: {
          Authorization: '${env:RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION}',
          'X-Project': '${env:PROJECT_NAME}',
        },
      };

      const envFile = path.resolve(tempDir, '.maia', 'mcp.env');
      assert.ok(!existsSync(envFile));
      assert.ok(!existsSync(path.resolve(tempDir, '.env')));

      store.addSource('mcp', {
        type: 'registry',
        url: 'https://registry.modelcontextprotocol.io',
        ref: 'v0.1',
        trusted: true,
      });
      const { installMcp } = await import('../../src/cli/install/mcp/install.mcp.ts');
      await installMcp(store, 'context7fork', 'mcp', '1.0.0', ['*'], config);

      assert.ok(existsSync(envFile));
      const content = readFileSync(envFile, 'utf8');
      assert.match(content, /^RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION=""/m);
      assert.match(content, /^PROJECT_NAME=""/m);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('uses external discovery from the npm-style install command', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-install-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          'https://registry.modelcontextprotocol.io/v0.1/servers?search=filesystem&version=latest&limit=10',
        );
        return registryResponse();
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveSelectedAgents(['copilot']);
      await installCommand(['mcp', 'filesystem'], { store });

      assert.ok(store.loadLock()?.packages['mcp:io.github.example/filesystem']);
      assert.ok(existsSync(path.resolve(tempDir, '.vscode', 'mcp.json')));
      const profile = readFileSync(path.resolve(tempDir, '.maia', 'agents', 'copilot', 'capabilities.json'), 'utf8');
      assert.match(profile, /io\.github\.example\/filesystem/);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('normalizes Smithery-style bare placeholders in remote headers', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-bare-placeholder-'));
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => Response.json({
        servers: [{
          server: {
            name: 'ai.smithery/renCosta2025-context7fork',
            title: 'Context7',
            description: 'Context7 remote MCP',
            version: '1.0.0',
            repository: { url: 'https://example.com/context7' },
            remotes: [{
              type: 'streamable-http',
              url: 'https://server.smithery.ai/@renCosta2025/context7fork/mcp',
              headers: [{
                name: 'Authorization',
                value: 'Bearer {smithery_api_key}',
                description: 'Smithery API key',
                isRequired: true,
                isSecret: true,
              }],
            }],
          },
        }],
      });

      const store = new AgentCatalogStore({ cwd: tempDir });
      const results = await discoverMcpsFromStore(store, 'context7');
      assert.equal(results.length, 1);
      assert.deepEqual(results[0]?.credentials, [{
        name: 'Authorization',
        envName: 'RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION',
        description: 'Smithery API key',
        sourceUrl: 'https://example.com/context7',
      }]);
      const install = results[0]?.install as { type: 'mcp'; vscode: { transport: string; headers?: Record<string, string> } };
      assert.equal(install.vscode.transport, 'http');
      assert.equal(install.vscode.headers?.Authorization, 'Bearer ${env:RENCOSTA2025_CONTEXT7FORK_AUTHORIZATION}');
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
