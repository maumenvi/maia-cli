import type { AgentCatalogStore } from '../../catalog/store/agent.catalog.store.ts';
import type { AgentMcpEntry } from '../contracts/agent.mcp.entry.ts';
import type { AgentTarget } from '../contracts/agent.target.ts';
import { resolveAuthorizedPackages } from '../profiles/resolve.authorized.packages.ts';
import { agentSupportsTransport } from './agent.supports.transport.ts';
import { mcpConfigToServerEntry } from './mcp.config.to.server.entry.ts';

/**
 * Build every MCP entry that should be registered natively for one agent:
 * each installed MCP server that is enabled, authorized for the agent, and
 * whose declared transport the agent's native format can represent (FR-004
 * — an incompatible transport is skipped for that agent specifically, with
 * a warning, rather than failing the whole sync), plus the aggregating
 * `maia` proxy server (kept last so it always wins on key collisions).
 */
export function collectAgentMcpEntries(store: AgentCatalogStore, target: AgentTarget): AgentMcpEntry[] {
  const projectRoot = store.getPaths().projectRoot;

  const mcpEntries = resolveAuthorizedPackages(store, target)
    .filter((pkg) => pkg.type === 'mcp')
    .flatMap<AgentMcpEntry>((pkg) => {
      if (!pkg.vscode) {
        throw new Error(`MCP "${pkg.name}" is missing its transport config in the lock`);
      }
      if (!agentSupportsTransport(target, pkg.vscode.transport)) {
        console.warn(`Skipping MCP "${pkg.name}" for ${target.name} (${target.id}): unsupported transport "${pkg.vscode.transport ?? 'stdio'}".`);
        return [];
      }
      return [{ key: pkg.name, config: mcpConfigToServerEntry(pkg.name, pkg.vscode) }];
    });

  return [...mcpEntries, target.buildEntry(projectRoot, target.id)];
}
