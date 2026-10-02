import { existsSync } from 'node:fs';

import type { AgentTarget } from '../contracts/agent.target.ts';
import { readJson } from './read.json.ts';

/** Whether an agent config file already registers the `maia` proxy. */
export function hasMaiaProxyEntry(target: AgentTarget, configPath: string): boolean {
  if (!existsSync(configPath)) return false;
  const topKey = target.configFormat === 'servers' ? 'servers' : 'mcpServers';
  const servers = readJson(configPath)[topKey] as Record<string, unknown> | undefined;
  return Boolean(servers && 'maia' in servers);
}
