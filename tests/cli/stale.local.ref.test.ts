import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import type { SourceLock } from '../../src/agent/catalog/types/lock/source.lock.ts';
import { ciCommand } from '../../src/cli/commands/ci.ts';
import { installCommand } from '../../src/cli/commands/install/install.command.ts';
import { ROOT_PACKAGE_VERSION } from '../support/root.package.version.ts';

const UPDATED_MESSAGE = `Updated maia.json source "local" ref from 1.5.2 (never published) to ${ROOT_PACKAGE_VERSION}; maia.lock.json regenerated.`;

/** Creates a project whose local source pins `ref` and has read_file installed, optionally without a lockfile. */
async function createProject(ref: string, withLock = true): Promise<{ tempDir: string; store: AgentCatalogStore }> {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-stale-ref-'));
  const store = new AgentCatalogStore({ cwd: tempDir });
  const manifest = store.loadManifest();
  manifest.sources.local = { ...manifest.sources.local, ref };
  store.saveManifest(manifest);
  await capture('log', () => installCommand(['tool', 'read_file'], { store }));
  if (!withLock) rmSync(path.join(tempDir, 'maia.lock.json'));
  return { tempDir, store };
}

/** Runs `fn` while capturing console output of the given stream. */
async function capture(stream: 'log' | 'warn', fn: () => Promise<void>): Promise<string[]> {
  const lines: string[] = [];
  const original = console[stream];
  console[stream] = (...args: unknown[]) => {
    lines.push(args.join(' '));
  };
  try {
    await fn();
  } finally {
    console[stream] = original;
  }
  return lines;
}

const readJson = (tempDir: string, file: string) => JSON.parse(readFileSync(path.join(tempDir, file), 'utf8'));
const localRefs = (lock: SourceLock) => Object.values(lock.packages)
  .filter((entry) => entry.source === 'local')
  .map((entry) => entry.provenance.ref);

describe('stale local source ref (1.5.2)', () => {
  it('maia i rewrites the ref, relocks, and maia ci then passes', async () => {
    const { tempDir, store } = await createProject('1.5.2');
    try {
      const output = await capture('log', () => installCommand([], { store }));

      assert.ok(output.includes(UPDATED_MESSAGE));
      assert.equal(readJson(tempDir, 'maia.json').sources.local.ref, ROOT_PACKAGE_VERSION);
      const refs = localRefs(readJson(tempDir, 'maia.lock.json'));
      assert.ok(refs.length > 0);
      assert.deepEqual([...new Set(refs)], [ROOT_PACKAGE_VERSION]);

      await ciCommand([], { store });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('maia i fixes a stale project that has no lockfile yet', async () => {
    const { tempDir, store } = await createProject('1.5.2', false);
    try {
      const output = await capture('log', () => installCommand([], { store }));

      assert.ok(output.includes(UPDATED_MESSAGE));
      assert.equal(readJson(tempDir, 'maia.json').sources.local.ref, ROOT_PACKAGE_VERSION);
      assert.deepEqual([...new Set(localRefs(readJson(tempDir, 'maia.lock.json')))], [ROOT_PACKAGE_VERSION]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('maia i leaves any other ref untouched', async () => {
    const { tempDir, store } = await createProject('1.5.7');
    try {
      const output = await capture('log', () => installCommand([], { store }));

      assert.ok(!output.some((line) => line.startsWith('Updated maia.json')));
      assert.equal(readJson(tempDir, 'maia.json').sources.local.ref, '1.5.7');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('maia i <name> does not migrate the ref', async () => {
    const { tempDir, store } = await createProject('1.5.2');
    try {
      await capture('log', () => installCommand(['tool', 'read_file'], { store }));

      assert.equal(readJson(tempDir, 'maia.json').sources.local.ref, '1.5.2');
      assert.deepEqual([...new Set(localRefs(readJson(tempDir, 'maia.lock.json')))], ['1.5.2']);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
