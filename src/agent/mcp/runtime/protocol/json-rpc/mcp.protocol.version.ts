import type { MCP_PROTOCOL_VERSIONS } from './protocol.versions.ts';

/** Enumerates protocol revisions implemented by Maia. */
export type McpProtocolVersion = (typeof MCP_PROTOCOL_VERSIONS)[number];

