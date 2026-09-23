import { isJsonRpcId } from './is.json.rpc.id.ts';
import type { JsonRpcResponse } from './json.rpc.response.ts';

/** Validates success and failure JSON-RPC response envelopes at runtime. */
export function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.jsonrpc !== '2.0' || !isJsonRpcId(candidate.id)) return false;

  const hasResult = Object.hasOwn(candidate, 'result');
  const hasError = Object.hasOwn(candidate, 'error');
  if (hasResult === hasError) return false;
  if (hasResult) return true;

  if (typeof candidate.error !== 'object' || candidate.error === null || Array.isArray(candidate.error)) {
    return false;
  }
  const error = candidate.error as Record<string, unknown>;
  return typeof error.code === 'number'
    && Number.isFinite(error.code)
    && typeof error.message === 'string';
}
