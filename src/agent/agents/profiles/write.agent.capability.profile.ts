import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { AgentCatalogStore } from '../../catalog/store/agent.catalog.store.ts';
import type { AgentTarget } from '../contracts/agent.target.ts';
import { mcpEntry } from '../registry/mcp.entry.ts';
import { resolveAuthorizedPackages } from './resolve.authorized.packages.ts';

/** Writes the capabilities authorized for one agent into its isolated Maia profile. */
export function writeAgentCapabilityProfile(store: AgentCatalogStore, target: AgentTarget): string {
  const paths = store.getPaths();
  const packages = resolveAuthorizedPackages(store, target);
  const profileDir = path.resolve(paths.agentsDir, target.id);
  const profileFile = path.resolve(profileDir, 'capabilities.json');
  const capabilities = {
    generatedAt: new Date().toISOString(),
    agent: { id: target.id, name: target.name },
    // The profile is informational; it never records a machine path.
    mcpServer: mcpEntry(target.id, 'omit'),
    skills: packages.filter((pkg) => pkg.type === 'skill'),
    tools: packages.filter((pkg) => pkg.type === 'tool'),
    mcps: packages.filter((pkg) => pkg.type === 'mcp'),
  };

  mkdirSync(profileDir, { recursive: true });
  writeFileSync(profileFile, `${JSON.stringify(capabilities, null, 2)}\n`, 'utf8');
  return profileFile;
}
