import { existsSync } from 'node:fs';

import type { AgentTarget } from '../contracts/agent.target.ts';
import { readJson } from './read.json.ts';
import { writeJson } from './write.json.ts';

/**
 * Deletes one MCP server key from an agent's native config file, for the
 * `mcp-servers`/`servers` JSON formats. `injectAgentConfig` only ever
 * upserts, so a removed MCP would otherwise linger in every native config
 * file that isn't rebuilt from scratch (unlike `syncVsCodeMcpConfig`,
 * which already replaces its file wholesale). No-op when the config file
 * doesn't exist or the key isn't present.
 */
export function removeAgentMcpEntry(target: AgentTarget, configPath: string, key: string): void {
  if (target.configFormat !== 'mcp-servers' && target.configFormat !== 'servers') {
    return;
  }
  if (!existsSync(configPath)) {
    return;
  }

  const topKey = target.configFormat === 'mcp-servers' ? 'mcpServers' : 'servers';
  const data = readJson(configPath);
  const servers = data[topKey] as Record<string, unknown> | undefined;
  if (!servers || !(key in servers)) {
    return;
  }

  const { [key]: _removed, ...remaining } = servers;
  writeJson(configPath, { ...data, [topKey]: remaining });
}
