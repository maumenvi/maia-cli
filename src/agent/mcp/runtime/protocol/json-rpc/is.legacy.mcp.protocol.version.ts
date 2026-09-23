import { MCP_LEGACY_PROTOCOL_VERSIONS } from './protocol.versions.ts';

/** Tests whether a value belongs to the stateful initialize-based MCP era. */
export function isLegacyMcpProtocolVersion(
  version: unknown,
): version is (typeof MCP_LEGACY_PROTOCOL_VERSIONS)[number] {
  return typeof version === 'string'
    && MCP_LEGACY_PROTOCOL_VERSIONS.includes(version as (typeof MCP_LEGACY_PROTOCOL_VERSIONS)[number]);
}

