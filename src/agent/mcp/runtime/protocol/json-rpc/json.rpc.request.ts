import type { JsonRpcId } from './json.rpc.id.ts';

/** Represents a JSON-RPC request sent over an MCP transport. */
export interface JsonRpcRequest<TParams = unknown> {
  jsonrpc: '2.0';
  id: JsonRpcId;
  method: string;
  params?: TParams;
}

