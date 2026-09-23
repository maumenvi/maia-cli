import { agentRegistry } from './agent.registry.ts';

/** Performs the list agent ids operation. */
export function listAgentIds(): string[] {
  return agentRegistry.map((a) => a.id);
}
