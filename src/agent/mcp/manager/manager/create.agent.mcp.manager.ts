import { AgentCatalogStore } from '../../../catalog/store/agent.catalog.store.ts';
import type { McpReliabilityConfig } from '../../reliability/contracts/mcp.reliability.config.ts';
import { AgentMcpManager } from './agent.mcp.manager.ts';
import type { LlmAccessPolicyProvider } from './llm.access.policy.provider.ts';

/** Performs the create agent mcp manager operation. */
export function createAgentMcpManager(
  catalog?: AgentCatalogStore,
  reliability?: Partial<McpReliabilityConfig>,
  llmAccessPolicies?: LlmAccessPolicyProvider,
): AgentMcpManager {
  return new AgentMcpManager(catalog, reliability, llmAccessPolicies);
}
