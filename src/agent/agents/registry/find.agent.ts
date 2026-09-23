import type { AgentTarget } from '../contracts/agent.target.ts';
import { agentRegistry } from './agent.registry.ts';

/** Performs the find agent operation. */
export function findAgent(id: string): AgentTarget | undefined {
  const normalized = id.toLowerCase();
  return agentRegistry.find((agent) => agent.id === normalized || agent.aliases?.includes(normalized));
}
