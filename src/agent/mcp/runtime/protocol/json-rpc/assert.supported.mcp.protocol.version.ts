import { isSupportedMcpProtocolVersion } from './is.supported.mcp.protocol.version.ts';
import type { McpProtocolVersion } from './mcp.protocol.version.ts';
import { MCP_PROTOCOL_VERSIONS } from './protocol.versions.ts';

/** Returns a supported revision or fails with the complete implemented-version list. */
export function assertSupportedMcpProtocolVersion(version: unknown): McpProtocolVersion {
  if (isSupportedMcpProtocolVersion(version)) {
    return version;
  }
  const rendered = typeof version === 'string' ? `"${version}"` : 'an omitted protocol version';
  throw new Error(`Unsupported MCP protocol version ${rendered}. Supported versions: ${MCP_PROTOCOL_VERSIONS.join(', ')}`);
}

