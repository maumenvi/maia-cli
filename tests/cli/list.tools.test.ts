import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { listToolsCommand } from '../../src/cli/commands/list-tools/list.tools.command.ts';

describe('CLI list-tools', () => {
  it('prints local capability inventory without remote discovery', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-list-tools-local-'));
    const output: string[] = [];
    const originalLog = console.log;
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addDependency('tool', 'read_file', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
      });
      store.buildLock();

      console.log = (...args: unknown[]) => {
        output.push(args.join(' '));
      };

      await listToolsCommand([], { store });
    } finally {
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }

    const rendered = output.join('\n');
    assert.match(rendered, /Maia capability discovery/);
    assert.match(rendered, /Configured registries/);
    assert.match(rendered, /Installed entries/);
    assert.match(rendered, /tool:read_file@1\.0\.0 source=local/);
    assert.match(rendered, /Local registry \(skills\)/);
    assert.match(rendered, /Local registry \(tools\)/);
    assert.match(rendered, /Local registry \(mcps\)/);
    assert.match(rendered, /maia list-tools <query>/);
  });

  it('does not create maia.lock.json when only reading discovery data', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-list-tools-readonly-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      await listToolsCommand([], { store });

      assert.equal(existsSync(path.resolve(tempDir, 'maia.lock.json')), false);
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'mcp.env')), false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('discovers skills and MCPs from configured catalogs with a query', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-list-tools-remote-'));
    const output: string[] = [];
    const originalLog = console.log;
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === 'https://skills.sh/api/search?q=react&limit=10') {
          return Response.json({
            skills: [{
              id: 'vercel-labs/skills/react',
              skillId: 'react',
              name: 'React',
              source: 'vercel-labs/skills',
            }],
          });
        }
        if (url === 'https://registry.modelcontextprotocol.io/v0.1/servers?search=react&version=latest&limit=10') {
          return Response.json({
            servers: [{
              server: {
                name: 'io.github.example/react',
                title: 'React MCP',
                repository: { url: 'https://github.com/example/react-mcp' },
                packages: [{
                  registryType: 'npm',
                  identifier: '@example/react-mcp',
                  version: '1.0.0',
                  transport: { type: 'stdio' },
                }],
              },
            }],
          });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      console.log = (...args: unknown[]) => {
        output.push(args.join(' '));
      };

      await listToolsCommand(['react'], { store });
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }

    const rendered = output.join('\n');
    assert.match(rendered, /Catalog discovery for "react"/);
    assert.match(rendered, /skills/);
    assert.match(rendered, /skill:react provider=skills source=vercel-labs\/skills/);
    assert.match(rendered, /mcps/);
    assert.match(rendered, /mcp:io\.github\.example\/react provider=mcp source=https:\/\/github\.com\/example\/react-mcp/);
  });

  it('supports structured JSON output for agent clients', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-list-tools-json-'));
    const output: string[] = [];
    const originalLog = console.log;
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === 'https://skills.sh/api/search?q=react&limit=10') {
          return Response.json({
            skills: [{
              id: 'vercel-labs/skills/react',
              skillId: 'react',
              name: 'React',
              source: 'vercel-labs/skills',
            }],
          });
        }
        if (url === 'https://registry.modelcontextprotocol.io/v0.1/servers?search=react&version=latest&limit=10') {
          return Response.json({
            servers: [{
              server: {
                name: 'io.github.example/react',
                title: 'React MCP',
                repository: { url: 'https://github.com/example/react-mcp' },
                packages: [{
                  registryType: 'npm',
                  identifier: '@example/react-mcp',
                  version: '1.0.0',
                  transport: { type: 'stdio' },
                }],
              },
            }],
          });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      console.log = (...args: unknown[]) => {
        output.push(args.join(' '));
      };

      await listToolsCommand(['react', '--json'], { store });
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }

    const rendered = output.join('\n');
    const payload = JSON.parse(rendered);
    assert.equal(payload.kind, 'capability-discovery');
    assert.equal(payload.query, 'react');
    assert.ok(Array.isArray(payload.installed));
    assert.ok(Array.isArray(payload.discovered.skills));
    assert.ok(Array.isArray(payload.discovered.mcps));
  });

  it('supports list-capabilities as unified discovery output', async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-list-capabilities-json-'));
    const output: string[] = [];
    const originalLog = console.log;
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === 'https://skills.sh/api/search?q=react&limit=10') {
          return Response.json({
            skills: [{
              id: 'vercel-labs/skills/react',
              skillId: 'react',
              name: 'React',
              source: 'vercel-labs/skills',
            }],
          });
        }
        if (url === 'https://registry.modelcontextprotocol.io/v0.1/servers?search=react&version=latest&limit=10') {
          return Response.json({
            servers: [{
              server: {
                name: 'io.github.example/react',
                title: 'React MCP',
                repository: { url: 'https://github.com/example/react-mcp' },
                packages: [{
                  registryType: 'npm',
                  identifier: '@example/react-mcp',
                  version: '1.0.0',
                  transport: { type: 'stdio' },
                }],
              },
            }],
          });
        }
        throw new Error(`Unexpected request: ${url}`);
      };

      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      console.log = (...args: unknown[]) => {
        output.push(args.join(' '));
      };

      const { listCapabilitiesCommand } = await import('../../src/cli/commands/list-capabilities/list.capabilities.command.ts');
      await listCapabilitiesCommand(['react', '--json'], { store });
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
      rmSync(tempDir, { recursive: true, force: true });
    }

    const rendered = output.join('\n');
    const payload = JSON.parse(rendered);
    assert.equal(payload.kind, 'capabilities');
    assert.equal(payload.query, 'react');
    assert.ok(Array.isArray(payload.installed));
    assert.ok(Array.isArray(payload.discovered.skills));
    assert.ok(Array.isArray(payload.discovered.tools));
    assert.ok(Array.isArray(payload.discovered.mcps));
  });
});
