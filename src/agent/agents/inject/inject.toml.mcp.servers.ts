import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { AgentMcpServerConfig } from '../contracts/agent.mcp.server.config.ts';
import { escapeTomlString } from './escape.toml.string.ts';

/** Performs the inject toml mcp servers operation. */
export function injectTomlMcpServers(filePath: string, key: string, serverConfig: AgentMcpServerConfig): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  const entry = [`${key} = {`];

  if (serverConfig.url) {
    entry.push(`  url = ${escapeTomlString(serverConfig.url)},`);
  }
  if (serverConfig.command) {
    entry.push(`  command = ${escapeTomlString(serverConfig.command)},`);
  }
  if (serverConfig.args) {
    entry.push(`  args = ${JSON.stringify(serverConfig.args)},`);
  }
  if (serverConfig.env && Object.keys(serverConfig.env).length > 0) {
    entry.push(`  env = ${JSON.stringify(serverConfig.env)},`);
  }
  if (serverConfig.cwd) {
    entry.push(`  cwd = ${escapeTomlString(serverConfig.cwd)},`);
  }
  const lastFieldIndex = entry.length - 1;
  entry[lastFieldIndex] = entry[lastFieldIndex].replace(/,$/, '');
  entry.push('}');

  const section = '[mcp_servers]';
  if (!existing.trim()) {
    writeFileSync(filePath, `${section}\n${entry.join('\n')}\n`, 'utf8');
    return;
  }

  const lines = existing.split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) => line.trim() === section);
  if (sectionIndex === -1) {
    writeFileSync(filePath, `${existing.trimEnd()}\n\n${section}\n${entry.join('\n')}\n`, 'utf8');
    return;
  }

  const nextHeaderIndex = lines.findIndex((line, index) => index > sectionIndex && line.trim().startsWith('[') && line.trim().endsWith(']'));
  const sectionBody = nextHeaderIndex === -1
    ? lines.slice(sectionIndex + 1)
    : lines.slice(sectionIndex + 1, nextHeaderIndex);
  const trailing = nextHeaderIndex === -1 ? [] : lines.slice(nextHeaderIndex);

  const kept: string[] = [];
  let skipEntry = false;
  for (const line of sectionBody) {
    if (skipEntry) {
      if (line.trim() === '}') {
        skipEntry = false;
      }
      continue;
    }

    if (new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=`).test(line)) {
      skipEntry = line.includes('{');
      continue;
    }

    if (line.trim()) {
      kept.push(line);
    }
  }

  const nextBody = [...kept, ...entry];
  const nextFile = [
    ...lines.slice(0, sectionIndex + 1),
    ...nextBody,
    ...(trailing.length > 0 ? ['', ...trailing] : []),
  ].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();

  writeFileSync(filePath, `${nextFile}\n`, 'utf8');
}
