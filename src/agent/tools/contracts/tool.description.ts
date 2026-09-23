
/** Describes the tool description contract. */
export interface ToolDescription {
  config: {
    tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown>; allowedLlms: string[] }>;
    skills: Array<{ name: string; description: string; usesTools: string[]; allowedLlms: string[] }>;
    llmAccessDefault?: 'allow' | 'deny';
  };
  tools: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>;
  skills: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>;
  metaTools: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>;
}
