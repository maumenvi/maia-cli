import type { MCPConfig } from '../../tools/contracts/mcp-config.ts';
import type { AgentTarget } from '../contracts/agent-target.ts';

/**
 * Checks whether `target` can represent `transport` in its native MCP
 * config format. An agent with no `supportedTransports` declared is
 * permissive — every transport today's `AgentMcpServerConfig` neutral
 * shape can represent is assumed supported, since no real `AgentTarget`
 * currently restricts this. Pure predicate — no I/O.
 */
export function agentSupportsTransport(target: AgentTarget, transport: MCPConfig['transport']): boolean {
  if (!target.supportedTransports) {
    return true;
  }
  const effectiveTransport = transport ?? 'stdio';
  return target.supportedTransports.includes(effectiveTransport);
}
