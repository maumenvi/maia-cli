/** Latest stateless MCP protocol revision implemented by Maia. */
export const MCP_MODERN_PROTOCOL_VERSION = '2026-07-28' as const;

/** Stateful MCP revisions supported through the initialize handshake. */
export const MCP_LEGACY_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2024-11-05'] as const;

/** All MCP protocol revisions implemented by Maia, newest first. */
export const MCP_PROTOCOL_VERSIONS = [MCP_MODERN_PROTOCOL_VERSION, ...MCP_LEGACY_PROTOCOL_VERSIONS] as const;

