import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { AgentMcpServerConfig } from '../contracts/agent.mcp.server.config.ts';
import { escapeTomlString } from './escape.toml.string.ts';
import { removeTomlMcpEntryText } from './remove.toml.mcp.entry.text.ts';
import { validateTomlStructure } from './validate.toml.structure.ts';

/** Performs the inject toml mcp servers operation. */
export function injectTomlMcpServers(filePath: string, key: string, serverConfig: AgentMcpServerConfig): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  if (existing) validateTomlStructure(existing, filePath);
  const entry = [`[mcp_servers.${key}]`];

  if (serverConfig.url) {
    entry.push(`url = ${escapeTomlString(serverConfig.url)}`);
  }
  if (serverConfig.command) {
    entry.push(`command = ${escapeTomlString(serverConfig.command)}`);
  }
  if (serverConfig.args) {
    entry.push(`args = [${serverConfig.args.map(escapeTomlString).join(', ')}]`);
  }
  if (serverConfig.env && Object.keys(serverConfig.env).length > 0) {
    const variables = Object.entries(serverConfig.env)
      .map(([name, value]) => `${escapeTomlString(name)} = ${escapeTomlString(value)}`);
    entry.push(`env = { ${variables.join(', ')} }`);
  }
  if (serverConfig.cwd) {
    entry.push(`cwd = ${escapeTomlString(serverConfig.cwd)}`);
  }
  const withoutOldEntry = removeTomlMcpEntryText(existing, key).contents;
  const nextFile = withoutOldEntry.trim()
    ? `${withoutOldEntry.trimEnd()}\n\n${entry.join('\n')}\n`
    : `${entry.join('\n')}\n`;
  if (nextFile !== existing) writeFileSync(filePath, nextFile, 'utf8');
}
