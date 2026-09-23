import { MAIA_PACKAGE_METADATA } from '../../../../../shared/package.metadata.ts';
import type { McpRequestMeta } from './mcp.request.meta.ts';
import { MCP_MODERN_PROTOCOL_VERSION } from './protocol.versions.ts';

/** Builds the required stateless request envelope for Maia as an MCP client. */
export function createModernRequestMeta(): McpRequestMeta {
  return {
    'io.modelcontextprotocol/protocolVersion': MCP_MODERN_PROTOCOL_VERSION,
    'io.modelcontextprotocol/clientInfo': {
      name: 'maia',
      version: MAIA_PACKAGE_METADATA.version,
    },
    'io.modelcontextprotocol/clientCapabilities': {},
  };
}
