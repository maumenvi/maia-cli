import { MAIA_PACKAGE_METADATA } from '../../../../../shared/package.metadata.ts';
import type { McpResultMeta } from './mcp.result.meta.ts';

/** Builds the server identity attached to every modern MCP result. */
export function createModernResultMeta(
  name: string = 'maia-mcp-server',
  version: string = MAIA_PACKAGE_METADATA.version,
): McpResultMeta {
  return {
    'io.modelcontextprotocol/serverInfo': { name, version },
  };
}
