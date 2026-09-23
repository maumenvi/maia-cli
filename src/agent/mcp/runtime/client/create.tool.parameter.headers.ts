import type { McpToolDescriptor } from '../protocol/json-rpc/mcp.tool.descriptor.ts';
import { encodeMcpHeaderValue } from '../transport/shared/encode.mcp.header.value.ts';

/** Mirrors tool arguments selected by `x-mcp-header` schema annotations into safe HTTP headers. */
export function createToolParameterHeaders(
  descriptor: McpToolDescriptor | undefined,
  args: Record<string, unknown>,
): Record<string, string> {
  const properties = descriptor?.inputSchema?.properties;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return {};
  }

  const headers: Record<string, string> = {};
  for (const [propertyName, rawSchema] of Object.entries(properties)) {
    if (!rawSchema || typeof rawSchema !== 'object' || Array.isArray(rawSchema)) {
      continue;
    }
    const headerName = (rawSchema as { 'x-mcp-header'?: unknown })['x-mcp-header'];
    const value = args[propertyName];
    if (typeof headerName !== 'string' || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(headerName)) {
      continue;
    }
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      continue;
    }
    headers[`Mcp-Param-${headerName}`] = encodeMcpHeaderValue(String(value));
  }
  return headers;
}
