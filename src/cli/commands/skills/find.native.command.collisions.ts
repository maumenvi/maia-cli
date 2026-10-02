import type { AgentTarget } from '../../../agent/agents/contracts/agent.target.ts';

/** Agents among `targets` that already have a built-in slash command named like the skill. */
export function findNativeCommandCollisions(name: string, targets: readonly AgentTarget[]): Array<{ agentName: string }> {
  const normalized = name.toLowerCase();
  return targets
    .filter((target) => target.nativeCommands?.includes(normalized))
    .map((target) => ({ agentName: target.name }));
}
