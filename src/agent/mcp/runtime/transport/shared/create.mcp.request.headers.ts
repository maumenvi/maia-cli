import type { McpRequestOptions } from '../../contracts/mcp.request.options.ts';
import { MCP_MODERN_PROTOCOL_VERSION } from '../../protocol/json-rpc/protocol.versions.ts';
import { encodeMcpHeaderValue } from './encode.mcp.header.value.ts';

/** Creates the protocol, routing, and caller-provided headers required by MCP HTTP. */
export function createMcpRequestHeaders(
  method: string,
  params: unknown,
  options: McpRequestOptions,
): Record<string, string> {
  const headers: Record<string, string> = {
    accept: 'application/json, text/event-stream',
    'content-type': 'application/json',
    ...options.headers,
  };
  if (options.protocolVersion) {
    headers['MCP-Protocol-Version'] = options.protocolVersion;
  }
  if (options.protocolVersion === MCP_MODERN_PROTOCOL_VERSION) {
    headers['Mcp-Method'] = method;
    if (method === 'tools/call' || method === 'resources/read' || method === 'prompts/get') {
      const candidate = params && typeof params === 'object'
        ? ((params as { name?: unknown; uri?: unknown }).name ?? (params as { uri?: unknown }).uri)
        : undefined;
      if (typeof candidate === 'string') {
        headers['Mcp-Name'] = encodeMcpHeaderValue(candidate);
      }
    }
  }
  return headers;
}
