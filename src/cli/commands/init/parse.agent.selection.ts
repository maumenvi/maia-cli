import { agentRegistry } from '../../../agent/agents/registry/agent.registry.ts';
import { supportedAgentsMessage } from './supported.agents.message.ts';

/** Performs the parse agent selection operation. */
export function parseAgentSelection(input: string): string[] {
  const tokens = input
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return [];
  }

  const selected = new Set<string>();
  const byName = new Map<string, string>();
  for (const agent of agentRegistry) {
    byName.set(agent.id, agent.id);
    for (const alias of agent.aliases ?? []) {
      byName.set(alias, agent.id);
    }
  }

  for (const token of tokens) {
    const normalized = token.toLowerCase();
    if (normalized === 'all' || normalized === '*') {
      for (const agent of agentRegistry) {
        selected.add(agent.id);
      }
      continue;
    }

    const numericIndex = Number(token);
    if (Number.isInteger(numericIndex) && numericIndex >= 1 && numericIndex <= agentRegistry.length) {
      selected.add(agentRegistry[numericIndex - 1].id);
      continue;
    }

    const mapped = byName.get(normalized);
    if (mapped) {
      selected.add(mapped);
      continue;
    }

    throw new Error(`Unknown agent "${token}". Supported: ${supportedAgentsMessage()}`);
  }

  return [...selected];
}
