import { existsSync, rmSync } from 'node:fs';

import type { AgentTarget } from '../contracts/agent.target.ts';
import { readJson } from './read.json.ts';
import { writeJson } from './write.json.ts';
import { removeTomlMcpEntry } from './remove.toml.mcp.entry.ts';

/** Deletes Maia's MCP entry from the selected agent's project config. */
export function removeAgentMcpEntry(target: AgentTarget, configPath: string, key: string): boolean {
  if (!existsSync(configPath)) return false;
  if (target.configFormat === 'continue-mcp-block') {
    rmSync(configPath, { force: true });
    return true;
  }
  if (target.configFormat === 'toml-mcp-servers') {
    return removeTomlMcpEntry(configPath, key);
  }

  const data = readJson(configPath);
  const topKey = target.configFormat === 'mcp-servers'
    ? 'mcpServers'
    : target.configFormat === 'zed-settings'
      ? 'context_servers'
      : 'servers';
  const servers = data[topKey] as Record<string, unknown> | undefined;
  if (!servers || !(key in servers)) {
    return false;
  }

  const { [key]: _removed, ...remaining } = servers;
  writeJson(configPath, { ...data, [topKey]: remaining });
  return true;
}
