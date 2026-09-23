import type { AgentMcpEntry } from '../contracts/agent.mcp.entry.ts';

/** Performs the mcp entry operation. */
export function mcpEntry(cwd: string, agentId: string): AgentMcpEntry {
  return {
    key: 'maia',
    config: { command: 'maia', args: ['mcp-server', '--agent', agentId], cwd },
  };
}
