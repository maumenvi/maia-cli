import type { AgentMcpEntry } from '../contracts/agent.mcp.entry.ts';

/** Renders the Maia stdio proxy in Continue's project MCP YAML format. */
export function renderContinueMcpBlock(entry: AgentMcpEntry): string {
  if (!entry.config.command) throw new Error('Continue MCP entries require a stdio command.');

  const lines = [
    'name: Maia',
    'version: 0.0.1',
    'schema: v1',
    'mcpServers:',
    `  - name: ${entry.key}`,
    '    type: stdio',
    `    command: ${JSON.stringify(entry.config.command)}`,
    '    args:',
    ...(entry.config.args ?? []).map((argument) => `      - ${JSON.stringify(argument)}`),
  ];

  if (entry.config.env && Object.keys(entry.config.env).length > 0) {
    lines.push('    env:');
    for (const [key, value] of Object.entries(entry.config.env)) {
      lines.push(`      ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
    }
  }

  return `${lines.join('\n')}\n`;
}
