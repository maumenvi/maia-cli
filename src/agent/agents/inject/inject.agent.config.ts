import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { AgentMcpEntry } from '../contracts/agent.mcp.entry.ts';
import type { AgentTarget } from '../contracts/agent.target.ts';
import { injectMcpServers } from './inject.mcp.servers.ts';
import type { InjectResult } from './inject.result.ts';
import { injectTomlMcpServers } from './inject.toml.mcp.servers.ts';
import { injectZedSettings } from './inject.zed.settings.ts';
import { renderContinueMcpBlock } from './render.continue.mcp.block.ts';
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
    const serialized = `${JSON.stringify(data, null, 2)}\n`;
    const changed = !existed || readFileSync(configPath, 'utf8') !== serialized;
    if (changed) writeJson(configPath, data);
    return { configPath, created: !existed && changed, updated: existed && changed, changed };
  }

  if (format === 'toml-mcp-servers') {
    const before = existed ? readFileSync(configPath, 'utf8') : '';
    for (const entry of entries) {
      injectTomlMcpServers(configPath, entry.key, entry.config);
    }
    const changed = before !== readFileSync(configPath, 'utf8');
    return { configPath, created: !existed && changed, updated: existed && changed, changed };
  }

  if (format === 'continue-mcp-block') {
    if (entries.length !== 1 || entries[0].key !== 'maia') {
      throw new Error('Continue MCP config must contain exactly one Maia proxy entry.');
    }
    const serialized = renderContinueMcpBlock(entries[0]);
    const changed = !existed || readFileSync(configPath, 'utf8') !== serialized;
    if (changed) {
      mkdirSync(dirname(configPath), { recursive: true });
      writeFileSync(configPath, serialized, 'utf8');
    }
    return { configPath, created: !existed && changed, updated: existed && changed, changed };
  }

  let data = readJson(configPath);
  const topKey = format === 'mcp-servers' ? 'mcpServers' : 'servers';
  for (const entry of entries) {
    data = injectMcpServers(data, entry.key, entry.config, topKey);
  }
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  const changed = !existed || readFileSync(configPath, 'utf8') !== serialized;
  if (changed) writeJson(configPath, data);
  return { configPath, created: !existed && changed, updated: existed && changed, changed };
}
