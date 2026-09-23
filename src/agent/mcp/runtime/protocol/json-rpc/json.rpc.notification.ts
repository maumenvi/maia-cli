/** Represents a JSON-RPC notification that does not expect a response. */
export interface JsonRpcNotification<TParams = unknown> {
  jsonrpc: '2.0';
  method: string;
  params?: TParams;
}

