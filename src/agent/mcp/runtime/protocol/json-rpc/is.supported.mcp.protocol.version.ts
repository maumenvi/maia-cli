import type { McpProtocolVersion } from './mcp.protocol.version.ts';
import { MCP_PROTOCOL_VERSIONS } from './protocol.versions.ts';

/** Tests whether a value names a protocol revision implemented by Maia. */
export function isSupportedMcpProtocolVersion(version: unknown): version is McpProtocolVersion {
  return typeof version === 'string' && MCP_PROTOCOL_VERSIONS.includes(version as McpProtocolVersion);
}

