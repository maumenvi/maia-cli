import { existsSync } from 'node:fs';
import path from 'node:path';

import type { AgentTarget } from '../contracts/agent.target.ts';
import { readJson } from './read.json.ts';
import { removeProxyEntry } from './remove.proxy.entry.ts';
import { writeJson } from './write.json.ts';

/** Removes this agent's legacy Maia entries after its current config is written. */
export function migrateLegacyProxyLocations(
  target: AgentTarget,
  projectRoot: string,
  destinationPath: string,
): string[] {
  const messages: string[] = [];
  for (const location of target.legacyProxyLocations?.(projectRoot) ?? []) {
    if (!existsSync(location.path)) continue;
    if (location.format === 'toml-mcp-servers') {
      throw new Error(`Unsupported legacy TOML proxy location: ${location.path}`);
    }

    const original = readJson(location.path);
    const updated = removeProxyEntry(original, location.format);
    if (JSON.stringify(updated) === JSON.stringify(original)) continue;
    writeJson(location.path, updated);

    const from = path.relative(projectRoot, location.path);
    if (target.id === 'cline') {
      messages.push(`Removed the "maia" proxy from ${from}: Cline reads only its global MCP settings.`);
      continue;
    }

    const to = path.relative(projectRoot, destinationPath);
    const sameFile = path.resolve(location.path) === path.resolve(destinationPath);
    const fromFormat = location.format === 'mcp-servers' ? 'mcpServers' : 'servers';
    const toFormat = target.configFormat === 'mcp-servers' ? 'mcpServers' : 'servers';
    messages.push(
      sameFile
        ? `Moved the "maia" proxy from ${from} (${fromFormat}) to ${to} (${toFormat}).`
        : `Moved the "maia" proxy from ${from} to ${to}.`,
    );
  }
  return messages;
}
