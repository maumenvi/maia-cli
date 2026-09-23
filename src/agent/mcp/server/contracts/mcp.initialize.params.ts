
/** Describes the mcp initialize params contract. */
export interface McpInitializeParams {
  protocolVersion?: string;
  clientInfo?: { name?: string; version?: string };
  capabilities?: Record<string, unknown>;
}
