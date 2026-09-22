import path from 'node:path';

import { resolveSourceCommit } from '../../../agent/catalog/manifest/source-hash/resolve-source-commit.ts';
import { parseGitHubRepository } from '../../../agent/catalog/providers/github/parse-git-hub-repository.ts';
import { resolveGitHubCommit } from '../../../agent/catalog/providers/github/resolve-git-hub-commit.ts';
import { findRegistryEntry } from '../../../agent/catalog/registry/read/find-registry-entry.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent-catalog-store.ts';
import { withRollback } from '../../shared/rollback/install-rollback.ts';
import { materializeRemoteSkill } from '../../shared/workspace/materialize-remote-skill.ts';
import { materializeSkill } from '../../shared/workspace/materialize-skill.ts';
import { removeMaterializedFile } from '../../shared/workspace/remove-materialized-file.ts';
import type { SkillInstallOptions } from './skill-install-options.ts';

/** Performs the install skill operation. */
export async function installSkill(store: AgentCatalogStore, options: SkillInstallOptions): Promise<void> {
  const manifest = store.loadManifest();
  const localEntry = options.source === 'local' ? findRegistryEntry('skill', options.name) : undefined;
  const lockBeforeInstall = store.loadLock();

  let targetPath: string;
  if (localEntry) {
    targetPath = materializeSkill(store, options.name);
  } else {
    let source = manifest.sources[options.source];
    if (!source) {
      throw new Error(`Unknown source "${options.source}" for skill "${options.name}"`);
    }
    if (manifest.config.strictVerify && source.type === 'git' && !/^[0-9a-f]{40}$/i.test(source.ref ?? '')) {
      const ref = source.ref ?? 'main';
      const genericResolution = parseGitHubRepository(source.url)
        ? null
        : resolveSourceCommit(options.source, source);
      if (genericResolution && !genericResolution.commitResolved) {
        throw new Error(`Unable to resolve commit for source "${options.source}" while strictVerify is enabled`);
      }
      const resolvedCommit = genericResolution?.commit ?? await resolveGitHubCommit(source.url, ref);
      source = {
        ...source,
        ref: resolvedCommit,
      };
      store.addSource(options.source, source);
    }
    targetPath = await materializeRemoteSkill(store, options.name, source);
  }

  await withRollback([
    {
      run: () => targetPath,
      undo: () => removeMaterializedFile(targetPath),
    },
    {
      run: () => store.addDependency('skill', options.name, {
        version: options.version,
        source: options.source,
        enabled: true,
        capabilities: [],
        constraints: [],
        allowedLlms: options.allowedLlms,
        path: path.relative(store.getPaths().stateDir, targetPath).replaceAll('\\', '/'),
      }),
      undo: () => store.removeDependency('skill', options.name),
    },
    {
      run: () => store.buildLock(),
      undo: () => {
        if (lockBeforeInstall) {
          store.saveLock(lockBeforeInstall);
        }
      },
    },
  ]);
}
