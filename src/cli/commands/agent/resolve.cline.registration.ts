import { existsSync } from 'node:fs';

import type { AgentTarget } from '../../../agent/agents/contracts/agent.target.ts';
import { inspectClineGlobalEntry } from '../../../agent/agents/global/inspect.cline.global.entry.ts';
import { pendingRegistration } from './pending.cline.registration.ts';
import { readClineSettings } from './read.cline.settings.ts';
import type { ClineRegistrationInspection } from './cline.registration.inspection.ts';

/** Reads Cline's existing global settings without creating or changing files. */
export function resolveClineRegistration(
  target: AgentTarget,
  projectRoot: string,
): ClineRegistrationInspection {
  if (!target.globalRegistration) {
    throw new Error(`Agent "${target.id}" does not define global registration.`);
  }

  const candidatePaths = target.globalRegistration.candidates().filter(existsSync);
  const entryKey = target.globalRegistration.entryKey(projectRoot);
  const expected = target.globalRegistration.entry(projectRoot);
  if (candidatePaths.length === 0) {
    return {
      registration: pendingRegistration(target, projectRoot, 'Cline reads MCP servers only from its global settings'),
      candidatePaths,
      entryKey,
      staleKeys: [],
      invalidSettings: false,
    };
  }

  const staleKeys = new Set<string>();
  for (const settingsPath of candidatePaths) {
    const parsed = readClineSettings(settingsPath);
    if (parsed.error) {
      console.warn(`warning: Cannot update ${settingsPath}: invalid JSON (${parsed.error.message})`);
      return {
        registration: pendingRegistration(target, projectRoot, 'Cline reads MCP servers only from its global settings'),
        candidatePaths,
        entryKey,
        staleKeys: [],
        invalidSettings: true,
      };
    }
    const state = inspectClineGlobalEntry(
      parsed.data,
      settingsPath,
      entryKey,
      expected,
      existsSync,
    );
    if (state.current) {
      return {
        registration: {
          status: 'registered',
          configPath: settingsPath,
          note: `Cline global entry \`${entryKey}\``,
        },
        candidatePaths,
        entryKey,
        staleKeys: state.stale,
        invalidSettings: false,
      };
    }
    state.stale.forEach((key) => staleKeys.add(key));
  }

  return {
    registration: pendingRegistration(target, projectRoot, 'Cline reads MCP servers only from its global settings'),
    candidatePaths,
    entryKey,
    staleKeys: [...staleKeys],
    invalidSettings: false,
  };
}
