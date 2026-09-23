import { isLegacyMcpProtocolVersion } from './is.legacy.mcp.protocol.version.ts';
import type { NegotiateMcpProtocolVersionResult } from './negotiate.mcp.protocol.version.result.ts';
import { MCP_LEGACY_PROTOCOL_VERSIONS } from './protocol.versions.ts';

/**
 * Negotiates the revision for a legacy initialize request.
 *
 * Three cases, per FR-004: an absent revision takes the newest supported one
 * (the MCP spec makes the field optional); a supported revision is echoed
 * back; and a revision this server does not implement is reported as
 * `unsupported` so the caller can reject it rather than silently reinterpret
 * it as something else.
 */
export function negotiateMcpProtocolVersion(
  requestedVersion?: string,
): NegotiateMcpProtocolVersionResult {
  if (typeof requestedVersion === 'undefined') {
    return { outcome: 'negotiated', version: MCP_LEGACY_PROTOCOL_VERSIONS[0] };
  }
  if (isLegacyMcpProtocolVersion(requestedVersion)) {
    return { outcome: 'negotiated', version: requestedVersion };
  }
  return {
    outcome: 'unsupported',
    requested: requestedVersion,
    supported: MCP_LEGACY_PROTOCOL_VERSIONS,
  };
}
