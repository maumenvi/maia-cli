import { MCP_MODERN_PROTOCOL_VERSION } from './protocol.versions.ts';

/** Tests whether a value belongs to the stateless per-request MCP era. */
export function isModernMcpProtocolVersion(version: unknown): version is typeof MCP_MODERN_PROTOCOL_VERSION {
  return version === MCP_MODERN_PROTOCOL_VERSION;
}

