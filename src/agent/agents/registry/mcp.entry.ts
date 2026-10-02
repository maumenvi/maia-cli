import type { AgentMcpEntry } from '../contracts/agent.mcp.entry.ts';
import type { AgentTarget } from '../contracts/agent.target.ts';

/**
 * The `maia` proxy entry for one agent. It never carries a machine path:
 * the agent either expands `${workspaceFolder}` or already starts servers
 * inside the project, where `maia mcp-server` finds the project root itself.
 */
export function mcpEntry(agentId: string, projectDir: AgentTarget['projectDir']): AgentMcpEntry {
  return {
    key: 'maia',
    config: {
      command: 'maia',
      args: ['mcp-server', '--agent', agentId],
      ...(projectDir === 'workspace-variable' ? { cwd: '${workspaceFolder}' } : {}),
    },
  };
}
