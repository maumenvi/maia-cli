import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { removeAgentMcpEntry } from '../../../agent/agents/inject/remove.agent.mcp.entry.ts';
import { resolveConfigPath } from '../../../agent/agents/inject/resolve.config.path.ts';
import { validateAgentMcpEntryRemoval } from '../../../agent/agents/inject/validate.agent.mcp.entry.removal.ts';
import { inspectClineGlobalEntry } from '../../../agent/agents/global/inspect.cline.global.entry.ts';
import { removeClineGlobalEntry } from '../../../agent/agents/global/remove.cline.global.entry.ts';
import { writeFileAtomic } from '../../../shared/fs/write.file.atomic.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { CliInteraction } from '../../contracts/cli.interaction.ts';
import { DEFAULT_INTERACTION } from '../../shared/terminal/default.interaction.ts';
import { removeMarkedBlock } from '../../shared/remove.marked.block.ts';
import { CAPABILITY_BLOCK_END, CAPABILITY_BLOCK_START } from './render.agent.capability.block.ts';
import { formatClinePath } from './format.cline.path.ts';
import { readClineSettings } from './read.cline.settings.ts';
import { resolveClineRegistration } from './resolve.cline.registration.ts';
import { resolveTargets } from './resolve.targets.ts';

/** Removes agent-specific project state while retaining native skill copies. */
export async function removeAgents(
  store: AgentCatalogStore,
  agentIds: string[],
  interaction: CliInteraction = DEFAULT_INTERACTION,
): Promise<void> {
  if (agentIds.length === 0) throw new Error('Usage: maia agent rm <name...>');
  const targets = resolveTargets(agentIds);
  const manifest = store.loadManifest();
  const configured = targets.filter((target) => Boolean(manifest.agents[target.id]));
  for (const target of targets) {
    if (!manifest.agents[target.id]) console.log(`${target.name} is not configured in this project.`);
  }
  if (configured.length === 0) return;

  const projectRoot = store.getPaths().projectRoot;
  const removeClineGlobalRegistration = async (
    target: (typeof configured)[number],
  ): Promise<void> => {
    if (!target.globalRegistration) return;
    const inspection = resolveClineRegistration(target, projectRoot);
    if (inspection.registration.status !== 'registered' || !interaction.isInteractive()) return;

    const accepted = await interaction.confirm(
      `Remove the "maia" proxy for this project from Cline's global settings at ${formatClinePath(inspection.registration.configPath)}?`,
    );
    if (!accepted) return;

    const expected = target.globalRegistration.entry(projectRoot);
    for (const settingsPath of inspection.candidatePaths) {
      if (!existsSync(settingsPath)) continue;
      const parsed = readClineSettings(settingsPath);
      if (parsed.error) {
        console.warn(`warning: Cannot update ${settingsPath}: invalid JSON (${parsed.error.message})`);
        continue;
      }
      const state = inspectClineGlobalEntry(
        parsed.data,
        settingsPath,
        inspection.entryKey,
        expected,
        existsSync,
      );
      if (!state.current) continue;
      const updated = removeClineGlobalEntry(parsed.data, inspection.entryKey);
      writeFileAtomic(settingsPath, `${JSON.stringify(updated, null, 2)}\n`);
    }
    console.log(`Removed the Cline global "maia" proxy from ${formatClinePath(inspection.registration.configPath)}.`);
  };
  const paths = new Map(configured.map((target) => [target.id, resolveConfigPath(target, projectRoot)]));
  for (const target of configured) {
    validateAgentMcpEntryRemoval(target, paths.get(target.id)!);
  }

  for (const target of configured) {
    const configPath = paths.get(target.id)!;
    store.removeSelectedAgents([target.id]);
    console.log(`Removed ${target.name} from maia.json.`);

    if (removeAgentMcpEntry(target, configPath, 'maia')) {
      console.log(`Removed the "maia" proxy from ${path.relative(projectRoot, configPath)}.`);
    }

    const instructionsPath = target.instructionsFile?.(projectRoot);
    if (instructionsPath && existsSync(instructionsPath)) {
      const original = readFileSync(instructionsPath, 'utf8');
      const updated = removeMarkedBlock(original, CAPABILITY_BLOCK_START, CAPABILITY_BLOCK_END);
      if (updated !== original) {
        writeFileSync(instructionsPath, updated, 'utf8');
        console.log(`Removed Maia's capability block from ${path.relative(projectRoot, instructionsPath)}.`);
      }
    }

    const profileDir = path.resolve(store.getPaths().agentsDir, target.id);
    if (profileDir.startsWith(`${path.resolve(store.getPaths().agentsDir)}${path.sep}`)) {
      rmSync(profileDir, { recursive: true, force: true });
    }

    await removeClineGlobalRegistration(target);

    const nativeSkillsDir = target.skillsDir?.(projectRoot);
    if (nativeSkillsDir && existsSync(nativeSkillsDir)) {
      console.log(`Skill copies in ${path.relative(projectRoot, nativeSkillsDir)} were kept; delete them manually if no longer needed.`);
    }
  }
}
