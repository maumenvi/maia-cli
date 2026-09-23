import { isJsonRpcResponse } from '../../protocol/json-rpc/is.json.rpc.response.ts';
import type { JsonRpcFailure } from '../../protocol/json-rpc/json.rpc.failure.ts';
import type { JsonRpcSuccess } from '../../protocol/json-rpc/json.rpc.success.ts';

/** Performs the parse sse or json operation. */
export function parseSseOrJson(payload: string): JsonRpcSuccess | JsonRpcFailure {
  const trimmed = payload.trim();
  if (trimmed.startsWith('{')) {
    const response: unknown = JSON.parse(trimmed);
    if (isJsonRpcResponse(response)) return response;
    throw new Error('MCP SSE transport received an invalid JSON-RPC response.');
  }
  const chunks = trimmed.split(/\n\n+/);
  for (const chunk of chunks) {
    const dataLines = chunk
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim());
    if (dataLines.length === 0) continue;
    const data = dataLines.join('\n');
    if (!data) continue;
    const response: unknown = JSON.parse(data);
    if (isJsonRpcResponse(response)) return response;
    throw new Error('MCP SSE transport received an invalid JSON-RPC response.');
  }
  throw new Error('MCP SSE transport did not receive an SSE data payload.');
}
