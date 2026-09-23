import { isLegacyMcpProtocolVersion } from './is.legacy.mcp.protocol.version.ts';
import { MCP_LEGACY_PROTOCOL_VERSIONS } from './protocol.versions.ts';

/** Returns a stateful revision or rejects a modern initialize response. */
export function assertLegacyMcpProtocolVersion(
  version: unknown,
): (typeof MCP_LEGACY_PROTOCOL_VERSIONS)[number] {
  if (isLegacyMcpProtocolVersion(version)) {
    return version;
  }
  const rendered = typeof version === 'string' ? `"${version}"` : 'an omitted protocol version';
  throw new Error(
    `Unsupported legacy MCP protocol version ${rendered}. `
      + `Initialize supports: ${MCP_LEGACY_PROTOCOL_VERSIONS.join(', ')}`,
  );
}

