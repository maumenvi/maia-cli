import type { MCPConfig } from '../../../../tools/contracts/mcp.config.ts';
import type { MCPStdioConfig } from '../../../../tools/contracts/mcp.stdio.config.ts';

/** Performs the as stdio config operation. */
export function asStdioConfig(config: MCPConfig): MCPStdioConfig {
  if (config.transport === 'http' || config.transport === 'npx' || config.transport === 'sse' || config.transport === 'ws') {
    throw new Error('MCP stdio transport cannot be created with non-stdio config.');
  }
  if (!config.command) {
    throw new Error('MCP stdio transport requires "command".');
  }
  return config;
}
