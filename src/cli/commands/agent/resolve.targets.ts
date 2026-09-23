import { findAgent } from '../../../agent/agents/registry/find.agent.ts';
import { normalizeAgentIds } from './normalize.agent.ids.ts';
import { supportedAgentsMessage } from './supported.agents.message.ts';

/** Performs the resolve targets operation. */
export function resolveTargets(agentIds: string[]) {
  const ids = normalizeAgentIds(agentIds);
  if (ids.length === 0) {
    const supported = supportedAgentsMessage();
    throw new Error(`Supported agents: ${supported}`);
  }

  const targets = ids.map((agentId) => {
    const target = findAgent(agentId);
    if (!target) {
      const supported = supportedAgentsMessage();
      throw new Error(`Unknown agent "${agentId}". Supported: ${supported}`);
    }
    return target;
  });

  return [...new Map(targets.map((target) => [target.id, target])).values()];
}
