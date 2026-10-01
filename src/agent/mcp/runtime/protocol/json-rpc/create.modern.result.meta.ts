import { readMaiaPackageVersion } from '../../../../../shared/package/read.maia.package.version.ts';
import type { McpResultMeta } from './mcp.result.meta.ts';

/** Builds the server identity attached to every modern MCP result. */
export function createModernResultMeta(
  name: string = 'maia-mcp-server',
  version: string = readMaiaPackageVersion(),
): McpResultMeta {
  return {
    'io.modelcontextprotocol/serverInfo': { name, version },
  };
}
