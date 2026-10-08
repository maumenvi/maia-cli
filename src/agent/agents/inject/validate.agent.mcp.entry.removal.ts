import { existsSync, readFileSync } from 'node:fs';

import type { AgentTarget } from '../contracts/agent.target.ts';
import { readJson } from './read.json.ts';
import { validateTomlStructure } from './validate.toml.structure.ts';

/** Validates an agent config before any manifest, profile, or instruction changes. */
export function validateAgentMcpEntryRemoval(target: AgentTarget, configPath: string): void {
  if (!existsSync(configPath)) return;
  if (target.configFormat === 'mcp-servers' || target.configFormat === 'servers' || target.configFormat === 'zed-settings') {
    readJson(configPath);
  } else if (target.configFormat === 'toml-mcp-servers') {
    validateTomlStructure(readFileSync(configPath, 'utf8'), configPath);
  }
}
