import type { JsonRpcId } from './json.rpc.id.ts';

/** Checks whether a value is a JSON-RPC identifier. */
export function isJsonRpcId(value: unknown): value is JsonRpcId {
  return value === null
    || typeof value === 'string'
    || (typeof value === 'number' && Number.isFinite(value));
}
