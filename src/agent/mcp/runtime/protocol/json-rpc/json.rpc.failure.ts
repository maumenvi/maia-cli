import type { JsonRpcId } from './json.rpc.id.ts';

/** Represents a failed JSON-RPC response, including optional structured MCP data. */
export interface JsonRpcFailure {
  jsonrpc: '2.0';
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

