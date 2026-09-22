import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent-catalog-store.ts';

describe('AgentCatalogStore', () => {
  it('enables strict source verification in new manifests', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-strict-default-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      const manifest = store.loadManifest();

      assert.equal(manifest.config.strictVerify, true);
      assert.equal(manifest.sources.local.type, 'registry');
      assert.equal(manifest.sources.local.url, 'npm:@maumenvi/maia-cli');
      assert.equal(manifest.sources.local.ref, '1.5.2');
      assert.throws(() => store.verifyLockMetadata(null), /maia.lock.json not found/);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates sources and maia.lock.json from dependencies', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-catalog-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addDependency('skill', 'repo_overview', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
        allowedLlms: ['model-x'],
      });
      store.addDependency('tool', 'read_file', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
      });
      store.addDependency('mcp', 'github', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
        vscode: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: {
            GITHUB_TOKEN: '${env:GITHUB_TOKEN}',
          },
        },
      });

      const lock = store.buildLock();
      assert.equal(lock.lockfileVersion, 1);
      assert.ok(lock.packages['skill:repo_overview']);
      assert.ok(lock.packages['tool:read_file']);
      assert.ok(lock.packages['mcp:github']);
      assert.deepEqual(lock.packages['skill:repo_overview'].allowedLlms, ['model-x']);
      assert.deepEqual(store.verifyLock(lock), { ok: true });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('builds dev and llm context files and syncs vscode mcp config', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-context-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.addDependency('mcp', 'filesystem', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
        vscode: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem'],
          env: {},
        },
      });
      store.buildLock();
      store.buildContexts();

      const paths = store.getPaths();
      assert.ok(existsSync(paths.contextDev));
      assert.ok(existsSync(paths.contextLlm));

      const syncResult = store.syncVsCodeMcp();
      assert.ok(existsSync(syncResult.file));
      const content = JSON.parse(readFileSync(syncResult.file, 'utf8')) as {
        servers: Record<string, Record<string, unknown>>;
      };
      assert.ok(content.servers.filesystem);
      assert.equal(content.servers.filesystem.command, 'npx');
      assert.deepEqual(content.servers.filesystem.args, ['-y', '@modelcontextprotocol/server-filesystem']);
      assert.equal(Object.prototype.hasOwnProperty.call(content.servers.filesystem, 'transport'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(content.servers.filesystem, 'package'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(content.servers.filesystem, 'npxArgs'), false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('applies deny-by-default policy for resources without allowedLlms', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-access-default-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());
      store.setLlmAccessDefault('deny');
      store.addDependency('skill', 'repo_overview', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
      });

      const lock = store.buildLock();
      assert.equal(store.getLlmAccessDefault(), 'deny');
      assert.deepEqual(lock.packages['skill:repo_overview'].allowedLlms, []);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails verification when a materialized artifact changes', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-verify-artifact-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      const skillPath = path.resolve(tempDir, '.maia', 'skills', 'repo_overview.ts');
      mkdirSync(path.dirname(skillPath), { recursive: true });
      writeFileSync(skillPath, 'export const skill = { execute: async () => ({ ok: true }) };\n', 'utf8');

      store.addDependency('skill', 'repo_overview', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
        path: 'skills/repo_overview.ts',
      });

      const lock = store.buildLock();
      assert.ok(lock.packages['skill:repo_overview'].artifactHash);

      writeFileSync(skillPath, 'export const skill = { execute: async () => ({ ok: false }) };\n', 'utf8');

      // verifyLock now accumulates problems instead of throwing, so a single
      // run can report everything (FR-002).
      const result = store.verifyLock(lock);
      assert.equal(result.ok, false);
      assert.ok(result.ok === false && result.problems.some((problem) =>
        problem.packageId === 'skill:repo_overview' && problem.kind === 'hash-mismatch'));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails verification when a locked artifact is removed', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-verify-missing-'));
    try {
      const store = new AgentCatalogStore({ cwd: tempDir });
      store.saveManifest(store.loadManifest());

      const skillPath = path.resolve(tempDir, '.maia', 'skills', 'repo_overview.ts');
      mkdirSync(path.dirname(skillPath), { recursive: true });
      writeFileSync(skillPath, 'export const skill = { execute: async () => ({ ok: true }) };\n', 'utf8');

      store.addDependency('skill', 'repo_overview', {
        version: '^1.0.0',
        source: 'local',
        enabled: true,
        path: 'skills/repo_overview.ts',
      });

      const lock = store.buildLock();
      rmSync(skillPath);

      const result = store.verifyLock(lock);
      assert.equal(result.ok, false);
      assert.ok(result.ok === false && result.problems.some((problem) =>
        problem.packageId === 'skill:repo_overview' && problem.kind === 'missing-artifact'));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
