import { canLlmAccessResource } from '../../../access/policy/can.llm.access.resource.ts';
import type { AgentCatalogStore } from '../../../catalog/store/agent.catalog.store.ts';
import type { McpToolEntry } from '../contracts/mcp.tool.entry.ts';
import { DEFAULT_SCHEMA } from './default.schema.ts';
import { MAIA_TOOLKITS_TOOL_NAME } from './maia.toolkits.tool.name.ts';

/** Collect tools exposed by skill and tool packages (no subprocess needed). */
export function collectLocalEntries(catalog: AgentCatalogStore, agentId?: string): McpToolEntry[] {
  const entries: McpToolEntry[] = [];

  for (const pkg of catalog.getInstalledPackages()) {
    if (!pkg.enabled) continue;
    if (pkg.name === MAIA_TOOLKITS_TOOL_NAME) {
      console.error(`maia: ignoring ${pkg.type} "${pkg.name}": the name is reserved`);
      continue;
    }
    if (!canLlmAccessResource(
      agentId,
      pkg.type,
      pkg.name,
      undefined,
      pkg.allowedLlms,
      catalog.getLlmAccessDefault(),
    )) continue;

    if (pkg.type === 'skill') {
      entries.push({
        name: pkg.name,
        description: pkg.capabilities?.join(', ') || `Skill: ${pkg.name}`,
        inputSchema: (pkg.inputSchema as Record<string, unknown>) ?? DEFAULT_SCHEMA,
        origin: `skill:${pkg.name}`,
      });
    }

    if (pkg.type === 'tool') {
      entries.push({
        name: pkg.name,
        description: pkg.capabilities?.join(', ') || `Tool: ${pkg.name}`,
        inputSchema: (pkg.inputSchema as Record<string, unknown>) ?? DEFAULT_SCHEMA,
        origin: `tool:${pkg.name}`,
      });
    }
  }

  return entries;
}
