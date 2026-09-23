import { agentRegistry } from '../../../agent/agents/registry/agent.registry.ts';

/** Performs the supported agents message operation. */
export function supportedAgentsMessage(): string {
  return agentRegistry
    .map((agent) => agent.aliases?.length ? `${agent.id} (aliases: ${agent.aliases.join(', ')})` : agent.id)
    .join(', ');
}
