
/** Describes the skill config contract. */
export interface SkillConfig {
  id?: string;
  name?: string;
  description: string;
  uses?: string[];
  handler?: string;
  pipelineId?: string;
  inputSchema?: Record<string, unknown>;
  allowedLlms?: string[];
}
