import type { ClineGlobalEntry } from './cline.global.entry.contract.ts';

/** Upserts Maia's fields while retaining Cline's and other servers' settings. */
export function upsertClineGlobalEntry(
  data: Record<string, unknown>,
  entryKey: string,
  entry: ClineGlobalEntry,
): Record<string, unknown> {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
  const servers = isRecord(data.mcpServers) ? data.mcpServers : {};
  const previous = isRecord(servers[entryKey]) ? servers[entryKey] : {};
  const previousEnv = isRecord(previous.env) ? previous.env : {};

  return {
    ...data,
    mcpServers: {
      ...servers,
      [entryKey]: {
        ...previous,
        command: entry.command,
        args: entry.args,
        env: { ...previousEnv, MAIA_PROJECT_DIR: entry.env.MAIA_PROJECT_DIR },
      },
    },
  };
}
