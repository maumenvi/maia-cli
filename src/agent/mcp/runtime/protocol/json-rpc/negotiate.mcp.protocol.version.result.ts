import type { MCP_LEGACY_PROTOCOL_VERSIONS } from './protocol.versions.ts';

/**
 * Outcome of negotiating a legacy initialize revision.
 *
 * `unsupported` exists so the server can reject an incompatible revision
 * explicitly instead of silently substituting its own (FR-004). An absent
 * revision is still `negotiated`, since the MCP spec allows omitting it.
 */
export type NegotiateMcpProtocolVersionResult =
  | { outcome: 'negotiated'; version: (typeof MCP_LEGACY_PROTOCOL_VERSIONS)[number] }
  | { outcome: 'unsupported'; requested: string; supported: readonly string[] };
