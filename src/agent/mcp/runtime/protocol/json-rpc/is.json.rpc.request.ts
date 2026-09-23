import { isJsonRpcId } from './is.json.rpc.id.ts';
import { isJsonRpcParams } from './is.json.rpc.params.ts';
import type { JsonRpcRequest } from './json.rpc.request.ts';

/** Validates the required JSON-RPC request fields at runtime. */
export function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.jsonrpc === '2.0'
    && Object.hasOwn(candidate, 'id')
    && isJsonRpcId(candidate.id)
    && typeof candidate.method === 'string'
    && candidate.method.length > 0
    && isJsonRpcParams(candidate.params);
}
