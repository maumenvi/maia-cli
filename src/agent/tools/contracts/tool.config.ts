
/** Describes the tool config contract. */
export interface ToolConfig {
  id?: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  allowedLlms?: string[];
}
