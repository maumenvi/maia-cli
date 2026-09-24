import type { McpToolEntry } from '../contracts/mcp.tool.entry.ts';
import { MAIA_TOOLKITS_TOOL_NAME } from './maia.toolkits.tool.name.ts';

/** Origin marking the built-in, read-only toolkit query tool. */
export const TOOLKIT_CATALOG_ORIGIN = 'toolkit:catalog';

/**
 * The read-only `maia_toolkits` entry, exposed to every agent. There is
 * deliberately no MCP tool that installs toolkits (FR-021).
 */
export function collectToolkitEntries(): McpToolEntry[] {
  return [{
    name: MAIA_TOOLKITS_TOOL_NAME,
    description: 'Lists Maia toolkits (available and installed): what each does, version, scope, file paths and docs. '
      + 'Read-only; install with the maia CLI.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Optional toolkit name to filter' } },
      additionalProperties: false,
    },
    origin: TOOLKIT_CATALOG_ORIGIN,
  }];
}
