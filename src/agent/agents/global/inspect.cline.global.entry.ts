import type { ClineGlobalEntry } from './cline.global.entry.contract.ts';
import type { ClineGlobalEntryState } from './cline.global.entry.state.ts';

/** Identifies the current project entry and Maia entries whose project disappeared. */
export function inspectClineGlobalEntry(
  data: Record<string, unknown>,
  settingsPath: string,
  entryKey: string,
  expected: ClineGlobalEntry,
  projectExists: (projectRoot: string) => boolean,
): ClineGlobalEntryState {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
  const isMaiaProjectEntry = (value: unknown): value is ClineGlobalEntry => {
    if (!isRecord(value) || value.command !== 'maia' || !Array.isArray(value.args) || !isRecord(value.env)) {
      return false;
    }
    return value.args[0] === 'mcp-server'
      && typeof value.env.MAIA_PROJECT_DIR === 'string'
      && value.env.MAIA_PROJECT_DIR.length > 0;
  };
  const matchesProject = (value: unknown): boolean => isMaiaProjectEntry(value)
    && JSON.stringify(value.args) === JSON.stringify(expected.args)
    && value.env.MAIA_PROJECT_DIR === expected.env.MAIA_PROJECT_DIR;

  const servers = isRecord(data.mcpServers) ? data.mcpServers : {};
  const current = matchesProject(servers[entryKey]);
  const stale = Object.entries(servers)
    .filter(([key, value]) => key !== entryKey
      && isMaiaProjectEntry(value)
      && !projectExists(value.env.MAIA_PROJECT_DIR))
    .map(([key]) => key);

  return { path: settingsPath, current, stale };
}
