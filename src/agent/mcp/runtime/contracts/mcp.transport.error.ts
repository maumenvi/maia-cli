/** Preserves transport status and whether a response contained structured MCP JSON-RPC. */
export class McpTransportError extends Error {
  readonly status?: number;
  readonly structuredProtocolError: boolean;

  /** Creates a transport failure that era negotiation can classify safely. */
  constructor(
    message: string,
    status?: number,
    structuredProtocolError = false,
  ) {
    super(message);
    this.name = 'McpTransportError';
    this.status = status;
    this.structuredProtocolError = structuredProtocolError;
  }
}
