import { existsSync } from 'node:fs';

import type { AgentRegistration } from '../../../agent/agents/contracts/agent.registration.ts';
import type { AgentTarget } from '../../../agent/agents/contracts/agent.target.ts';
import { inspectClineGlobalEntry } from '../../../agent/agents/global/inspect.cline.global.entry.ts';
import { removeClineGlobalEntry } from '../../../agent/agents/global/remove.cline.global.entry.ts';
import { upsertClineGlobalEntry } from '../../../agent/agents/global/upsert.cline.global.entry.ts';
import { writeFileAtomic } from '../../../shared/fs/write.file.atomic.ts';
import type { CliInteraction } from '../../contracts/cli.interaction.ts';
import { formatClinePath } from './format.cline.path.ts';
import { pendingRegistration } from './pending.cline.registration.ts';
import { readClineSettings } from './read.cline.settings.ts';
import { resolveClineRegistration } from './resolve.cline.registration.ts';
import type { ClineRegistrationInspection } from './cline.registration.inspection.ts';

/** Offers confirmed registration in every existing Cline settings candidate. */
export async function offerClineGlobalRegistration(
  target: AgentTarget,
  projectRoot: string,
  interaction: CliInteraction,
  knownInspection?: ClineRegistrationInspection,
): Promise<AgentRegistration> {
  const inspection = knownInspection ?? resolveClineRegistration(target, projectRoot);
  if (
    inspection.registration.status === 'registered'
    || inspection.candidatePaths.length === 0
    || inspection.invalidSettings
  ) {
    return inspection.registration;
  }
  if (!interaction.isInteractive()) {
    return inspection.registration;
  }

  const paths = inspection.candidatePaths.map(formatClinePath);
  const staleDescription = inspection.staleKeys.length > 0
    ? `\nAlso remove ${inspection.staleKeys.length} stale Maia entr${inspection.staleKeys.length === 1 ? 'y' : 'ies'} pointing to missing folders: ${inspection.staleKeys.join(', ')}`
    : '';
  const accepted = await interaction.confirm(
    `Cline reads MCP servers only from its global settings. Add the "maia" proxy for this project to:\n  ${paths.join('\n  ')}\nEntry "${inspection.entryKey}": maia mcp-server --agent ${target.id} (MAIA_PROJECT_DIR=${projectRoot})${staleDescription}\nProceed?`,
  );
  if (!accepted) return inspection.registration;

  const expected = target.globalRegistration!.entry(projectRoot);
  let writtenPath: string | undefined;
  for (const settingsPath of inspection.candidatePaths) {
    if (!existsSync(settingsPath)) continue;
    const parsed = readClineSettings(settingsPath);
    if (parsed.error) {
      console.warn(`warning: Cannot update ${settingsPath}: invalid JSON (${parsed.error.message})`);
      return pendingRegistration(target, projectRoot, 'Cline reads MCP servers only from its global settings');
    }

    let updated = upsertClineGlobalEntry(parsed.data, inspection.entryKey, expected);
    const state = inspectClineGlobalEntry(
      updated,
      settingsPath,
      inspection.entryKey,
      expected,
      existsSync,
    );
    for (const staleKey of state.stale) updated = removeClineGlobalEntry(updated, staleKey);
    writeFileAtomic(settingsPath, `${JSON.stringify(updated, null, 2)}\n`);
    writtenPath ??= settingsPath;
  }

  if (!writtenPath) return pendingRegistration(target, projectRoot, 'Cline settings file not found. Open Cline once and run "maia agent add cline" again.');
  return { status: 'registered', configPath: writtenPath, note: `Cline global entry \`${inspection.entryKey}\`` };
}
