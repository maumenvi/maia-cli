import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { AccessDefaultPolicy } from '../../access/policy/access-default-policy.ts';
import { writeFileAtomic } from '../../../shared/fs/write-file-atomic.ts';
import { agentRegistry } from '../../agents/registry/agent-registry.ts';
import { findAgent } from '../../agents/registry/find-agent.ts';
import { buildCatalogContexts } from '../context/build.ts';
import { syncVsCodeMcpConfig } from '../context/sync-mcp/sync-vs-code-mcp-config.ts';
import { buildLockFromManifest } from '../lock/build.ts';
import type { VerifySourceLockOptions } from '../lock/verify-source-lock-options.ts';
import { verifySourceLockMetadata } from '../lock/verify/verify-source-lock-metadata.ts';
import { verifySourceLock } from '../lock/verify/verify-source-lock.ts';
import { createDefaultManifest } from '../manifest/defaults.ts';
import { normalizeManifest } from '../manifest/normalize/normalize-manifest.ts';
import { resolveCatalogPaths } from '../paths/resolve-catalog-paths.ts';
import { discoverRegistryEntries } from '../registry/discover.ts';
import { removeManifestDependency } from '../registry/manifest-deps/remove-manifest-dependency.ts';
import { setManifestDependency } from '../registry/manifest-deps/set-manifest-dependency.ts';
import { resolveRuntimeModulePath } from '../registry/runtime.ts';
import { mapDiscoverEntries } from '../shared/discovery.ts';
import { safeParseJson } from '../shared/json.ts';
import type { McpDependency } from '../types/dependencies/mcp-dependency.ts';
import type { SkillDependency } from '../types/dependencies/skill-dependency.ts';
import type { ToolDependency } from '../types/dependencies/tool-dependency.ts';
import type { CatalogKind } from '../types/kinds.ts';
import type { LockPackage } from '../types/lock/lock-package.ts';
import type { SourceLock } from '../types/lock/source-lock.ts';
import type { SourcesManifest } from '../types/manifest/sources-manifest.ts';
import type { CatalogSource } from '../types/source/catalog-source.ts';
import type { CatalogStoreOptions } from '../types/store/catalog-store-options.ts';

/** Coordinates the agent catalog store behavior. */
export class AgentCatalogStore {
  private readonly paths;

  /** Initializes a new AgentCatalogStore instance. */
  constructor(options: CatalogStoreOptions = {}) {
    this.paths = resolveCatalogPaths(options);
  }

  /** Performs the get paths operation. */
  getPaths() {
    return this.paths;
  }

  /** Performs the load manifest operation. */
  loadManifest(): SourcesManifest {
    if (!existsSync(this.paths.manifest)) {
      return createDefaultManifest();
    }
    const parsed = safeParseJson<Partial<SourcesManifest>>(readFileSync(this.paths.manifest, 'utf8'), this.paths.manifest);
    return normalizeManifest(parsed);
  }

  /** Reads the manifest's raw `maiaVersion` field, if present, without normalizing it. */
  peekManifestVersion(): string | undefined {
    if (!existsSync(this.paths.manifest)) {
      return undefined;
    }
    const parsed = safeParseJson<Partial<SourcesManifest>>(readFileSync(this.paths.manifest, 'utf8'), this.paths.manifest);
    return parsed.maiaVersion;
  }

  /** Performs the get llm access default operation. */
  getLlmAccessDefault(): AccessDefaultPolicy {
    return this.loadManifest().config.llmAccessDefault;
  }

  /** Performs the set llm access default operation. */
  setLlmAccessDefault(policy: AccessDefaultPolicy): void {
    const manifest = this.loadManifest();
    manifest.config.llmAccessDefault = policy;
    this.saveManifest(manifest);
  }

  /** Performs the save manifest operation. */
  saveManifest(manifest: SourcesManifest): void {
    mkdirSync(this.paths.stateDir, { recursive: true });
    mkdirSync(path.dirname(this.paths.manifest), { recursive: true });
    writeFileAtomic(this.paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  /** Performs the load lock operation. */
  loadLock(): SourceLock | null {
    if (!existsSync(this.paths.lock)) {
      return null;
    }
    return safeParseJson<SourceLock>(readFileSync(this.paths.lock, 'utf8'), this.paths.lock);
  }

  /** Performs the save lock operation. */
  saveLock(lock: SourceLock): void {
    mkdirSync(path.dirname(this.paths.lock), { recursive: true });
    writeFileAtomic(this.paths.lock, `${JSON.stringify(lock, null, 2)}\n`);
  }

  /** Performs the add source operation. */
  addSource(alias: string, source: CatalogSource): void {
    const manifest = this.loadManifest();
    manifest.sources[alias] = source;
    this.saveManifest(manifest);
  }

  /** Performs the add dependency operation. */
  addDependency(kind: CatalogKind, name: string, dependency: SkillDependency | McpDependency | ToolDependency): void {
    const manifest = this.loadManifest();
    this.saveManifest(setManifestDependency(manifest, kind, name, dependency));
  }

  /** Performs the save selected agents operation. */
  saveSelectedAgents(agentIds: string[]): void {
    const manifest = this.loadManifest();
    const selected = new Map<string, { id: string; name: string; enabled: boolean; addedAt: string }>();

    for (const id of [...new Set(agentIds)]) {
      const target = findAgent(id) ?? agentRegistry.find((agent) => agent.id === id);
      const agentName = target?.name ?? id;
      const canonicalId = target?.id ?? id;
      selected.set(canonicalId, {
        id: canonicalId,
        name: agentName,
        enabled: true,
        addedAt: new Date().toISOString(),
      });
    }

    manifest.agents = {
      ...manifest.agents,
      ...Object.fromEntries(selected.entries()),
    };
    this.saveManifest(manifest);
  }

  /** Performs the remove dependency operation. */
  removeDependency(kind: CatalogKind, name: string): void {
    const manifest = this.loadManifest();
    this.saveManifest(removeManifestDependency(manifest, kind, name));
  }

  /** Performs the discover operation. */
  discover(
    kind: CatalogKind,
    query = '',
    limit = 10,
  ): Array<{ name: string; description: string; source: string; allowedLlms?: string[] }> {
    return mapDiscoverEntries(discoverRegistryEntries(kind, query, limit));
  }

  /** Performs the build lock operation. */
  buildLock(): SourceLock {
    const lock = buildLockFromManifest(this.loadManifest(), this.paths.stateDir);
    this.saveLock(lock);
    return lock;
  }

  /** Verifies lock metadata and artifact hashes without changing catalog state. */
  verifyLock(
    lock: SourceLock | null = this.loadLock(),
    options: VerifySourceLockOptions = {},
  ): { ok: true } {
    if (!lock) {
      throw new Error('maia.lock.json not found. Run "maia lock" first.');
    }
    return verifySourceLock(lock, this.paths.stateDir, options);
  }

  /** Performs the verify lock metadata operation. */
  verifyLockMetadata(lock: SourceLock | null = this.loadLock()): { ok: true } {
    if (!lock) {
      throw new Error('maia.lock.json not found. Run "maia lock" first.');
    }
    return verifySourceLockMetadata(lock);
  }

  /** Performs the get installed packages operation. */
  getInstalledPackages(kind?: CatalogKind): LockPackage[] {
    const lock = this.loadLock();
    if (!lock) {
      return [];
    }
    const packages = Object.values(lock.packages);
    return kind ? packages.filter((pkg) => pkg.type === kind) : packages;
  }

  /** Performs the load runtime module operation. */
  async loadRuntimeModule(kind: CatalogKind, name: string): Promise<unknown> {
    const lock = this.loadLock();
    const match = lock ? Object.values(lock.packages).find((pkg) => pkg.type === kind && pkg.name === name) : undefined;
    if (match?.path) {
      const candidate = match.path.startsWith('/')
        ? match.path
        : path.resolve(this.paths.stateDir, match.path);
      if (existsSync(candidate)) {
        if (candidate.endsWith('.md')) {
          const markdown = readFileSync(candidate, 'utf8');
          return {
            [kind]: {
              execute: async (_input: unknown) => ({
                kind,
                name,
                markdown,
              }),
            },
          };
        }
        return import(pathToFileURL(candidate).href);
      }
    }

    const targetPath = resolveRuntimeModulePath(kind, name);
    if (!existsSync(targetPath)) {
      throw new Error(`Runtime module not found for ${kind} "${name}" at ${targetPath}`);
    }
    return import(pathToFileURL(targetPath).href);
  }

  /** Performs the build contexts operation. */
  buildContexts() {
    const lock = this.loadLock() ?? this.buildLock();
    return buildCatalogContexts(this.paths, lock);
  }

  /** Performs the sync vs code mcp operation. */
  syncVsCodeMcp() {
    const lock = this.loadLock() ?? this.buildLock();
    return syncVsCodeMcpConfig(this.paths, lock);
  }
}
