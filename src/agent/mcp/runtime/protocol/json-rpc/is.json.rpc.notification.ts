import { isJsonRpcParams } from './is.json.rpc.params.ts';
import type { JsonRpcNotification } from './json.rpc.notification.ts';

/** Validates a JSON-RPC notification and rejects messages that contain an id. */
export function isJsonRpcNotification(value: unknown): value is JsonRpcNotification {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.jsonrpc === '2.0'
    && !Object.hasOwn(candidate, 'id')
    && typeof candidate.method === 'string'
    && candidate.method.length > 0
    && isJsonRpcParams(candidate.params);
}
