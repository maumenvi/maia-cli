import type { McpTransport } from '../../contracts/mcp.transport.ts';
import { JsonRpcMcpClient } from './json.rpc.mcp.client.ts';

/** Creates Maia's JSON-RPC MCP client for a configured transport. */
export function createJsonRpcMcpClient(transport: McpTransport): JsonRpcMcpClient {
  return new JsonRpcMcpClient(transport);
}
