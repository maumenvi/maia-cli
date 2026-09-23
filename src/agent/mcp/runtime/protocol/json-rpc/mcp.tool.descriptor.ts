/** Describes an MCP tool and the JSON Schema accepted by its arguments. */
export interface McpToolDescriptor {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

