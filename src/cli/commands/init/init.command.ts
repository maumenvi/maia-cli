import path from 'node:path';

import { createDefaultManifest } from '../../../agent/catalog/manifest/defaults.ts';
import type { CommandHandler } from '../../contracts/command.handler.ts';
import { configureAgents } from '../agent/configure.agents.ts';
import { resolveTargets } from '../agent/resolve.targets.ts';
import { assertManifestSchemaCompatible } from './assert.manifest.schema.compatible.ts';
import { ensureInitialized } from './ensure.initialized.ts';
import { ensureAgentGuidanceFile } from './ensure.agent.guidance.file.ts';
import { normalizeAgentIds } from './normalize.agent.ids.ts';
import { promptForAgentIds } from './prompt.for.agent.ids.ts';
import { restoreConfiguredAgents } from './restore.configured.agents.ts';

/** Performs the init command operation. */
export const initCommand: CommandHandler = async (args, { store }) => {
  assertManifestSchemaCompatible(store.peekManifestVersion(), createDefaultManifest().maiaVersion);

  const explicitAgentIds = normalizeAgentIds(args);
  let agentIds: string[];

  if (explicitAgentIds.length > 0) {
    agentIds = explicitAgentIds;
  } else {
    const hasSavedAgents = Object.keys(store.loadManifest().agents ?? {}).length > 0;
    const outcome = await promptForAgentIds();
    if (outcome.kind === 'non-interactive' && !hasSavedAgents) {
      // Only a genuinely fresh project (no agents ever configured) is rejected
      // here — re-running init non-interactively with no new agents on a
      // project that already has saved agents must keep restoring them (FR-010).
      throw new Error(
        'No agents were provided in a non-interactive environment. '
        + 'Pass one or more agent ids as arguments, e.g. "maia init claude".',
      );
    }
    agentIds = outcome.kind === 'selected' ? outcome.agentIds : [];
  }

  ensureInitialized(store);

  if (agentIds.length === 0) {
    store.saveSelectedAgents([]);
    const paths = store.getPaths();
    if (Object.keys(store.loadManifest().agents).length === 0) {
      ensureAgentGuidanceFile(path.resolve(paths.stateDir, 'AGENT.md'));
      ensureAgentGuidanceFile(path.resolve(paths.stateDir, 'AGENTS.md'));
    }
    console.log('Initialized maia manifest, lockfile, and fallback capability folders');
    restoreConfiguredAgents(store);
    return;
  }

  const targets = resolveTargets(agentIds);
  const uniqueTargets = [...new Map(targets.map((target) => [target.id, target])).values()];
  const selectedIds = uniqueTargets.map((target) => target.id);
  store.saveSelectedAgents(selectedIds);

  console.log('Initialized maia manifest, lockfile, and agent configuration');
  configureAgents(store, selectedIds);
};
