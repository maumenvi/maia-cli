import { existsSync } from 'node:fs';

import type { AgentMcpEntry } from '../contracts/agent.mcp.entry.ts';
import type { AgentTarget } from '../contracts/agent.target.ts';
import { injectMcpServers } from './inject.mcp.servers.ts';
import type { InjectResult } from './inject.result.ts';
import { injectTomlMcpServers } from './inject.toml.mcp.servers.ts';
import { injectZedSettings } from './inject.zed.settings.ts';
import { readJson } from './read.json.ts';
import { writeJson } from './write.json.ts';

/**
 * Register every provided MCP entry in the agent's native config file, using the
 * schema the agent expects. Each entry is keyed independently, so repeated runs
 * upsert rather than duplicate.
 */
export function injectAgentConfig(
  target: AgentTarget,
  configPath: string,
  entries: AgentMcpEntry[],
): InjectResult {
  const format = target.configFormat;
  const existed = existsSync(configPath);

  if (format === 'zed-settings') {
    let data = readJson(configPath);
    for (const entry of entries) {
      data = injectZedSettings(data, entry.key, entry.config);
    }
    writeJson(configPath, data);
    return { configPath, created: !existed, updated: existed };
  }

  if (format === 'toml-mcp-servers') {
    for (const entry of entries) {
      injectTomlMcpServers(configPath, entry.key, entry.config);
    }
    return { configPath, created: !existed, updated: existed };
  }

  let data = readJson(configPath);
  const topKey = format === 'mcp-servers' ? 'mcpServers' : 'servers';
  for (const entry of entries) {
    data = injectMcpServers(data, entry.key, entry.config, topKey);
  }
  writeJson(configPath, data);
  return { configPath, created: !existed, updated: existed };
}
