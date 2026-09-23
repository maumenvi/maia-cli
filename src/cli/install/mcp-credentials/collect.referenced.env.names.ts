import type { MCPConfig } from '../../../agent/tools/contracts/mcp.config.ts';
import { parseEnvNames } from './parse.env.names.ts';

/** Performs the collect referenced env names operation. */
export function collectReferencedEnvNames(config: MCPConfig | undefined): string[] {
  if (!config) {
    return [];
  }

  const names = new Set<string>();
  const candidates: Array<Record<string, string> | undefined> = [
    'env' in config ? config.env : undefined,
    'headers' in config ? config.headers : undefined,
  ];

  for (const group of candidates) {
    if (!group) {
      continue;
    }
    for (const value of Object.values(group)) {
      for (const envName of parseEnvNames(String(value ?? ''))) {
        names.add(envName);
      }
    }
  }

  return Array.from(names);
}
