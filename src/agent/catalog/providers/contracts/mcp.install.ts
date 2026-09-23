import type { MCPConfig } from '../../../tools/contracts/mcp.config.ts';

/** Describes the mcp install contract. */
export interface McpInstall {
  type: 'mcp';
  vscode: MCPConfig;
}
