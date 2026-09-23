import type { AgentCatalogStore } from '../../catalog/store/agent.catalog.store.ts';
import type { Repository } from '../../tools/contracts/repository.ts';
import type { CircuitState } from '../reliability/contracts/circuit.state.ts';
import type { McpReliabilityConfig } from '../reliability/contracts/mcp.reliability.config.ts';
import type { McpSession } from '../runtime/contracts/mcp.session.ts';

/** Performs the describe manager operation. */
export function describeManager(
  catalog: AgentCatalogStore,
  repositories: Repository[],
  sessions: Map<string, McpSession>,
  reliability: McpReliabilityConfig,
  circuits: Array<{ serverName: string } & CircuitState>,
) {
  const installed = catalog.getInstalledPackages('mcp').map((pkg) => ({
    name: pkg.name,
    description: `MCP server ${pkg.name}`,
    inputSchema: { type: 'object', properties: {} },
    vscode: pkg.vscode,
  }));

  return {
    config: { tools: installed },
    tools: installed,
    repositories,
    lock: catalog.getPaths().lock,
    manifest: catalog.getPaths().manifest,
    reliability,
    circuits,
    sessions: [...sessions.values()].map((session) => ({
      serverName: session.serverName,
      status: session.status,
      startedAt: session.startedAt,
      lastHealthcheckAt: session.lastHealthcheckAt,
      lastError: session.lastError,
    })),
  };
}
