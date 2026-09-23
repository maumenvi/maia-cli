import type { JsonRpcId } from './json.rpc.id.ts';

/** Represents a successful JSON-RPC response. */
export interface JsonRpcSuccess<TResult = unknown> {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result: TResult;
}

