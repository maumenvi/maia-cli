import type { MCPConfig } from '../../../tools/contracts/mcp.config.ts';
import type { CatalogDependencyBase } from './catalog.dependency.base.ts';

/** Describes the mcp dependency contract. */
export interface McpDependency extends CatalogDependencyBase {
  vscode: MCPConfig;
}
