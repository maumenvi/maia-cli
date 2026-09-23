/** Preserves the structured code and data returned by an MCP JSON-RPC peer. */
export class McpJsonRpcError extends Error {
  readonly code: number;
  readonly data?: unknown;

  /** Creates a structured error without discarding protocol negotiation data. */
  constructor(
    code: number,
    message: string,
    data?: unknown,
  ) {
    super(`MCP error ${code}: ${message}`);
    this.name = 'McpJsonRpcError';
    this.code = code;
    this.data = data;
  }
}
