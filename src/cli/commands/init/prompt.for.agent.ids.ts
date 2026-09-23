import { createInterface } from 'node:readline/promises';

import { agentRegistry } from '../../../agent/agents/registry/agent.registry.ts';
import type { AgentSelectionOutcome } from './agent.selection.outcome.ts';
import { parseAgentSelection } from './parse.agent.selection.ts';

/**
 * Prompts the developer to select agents interactively when a TTY is
 * available. Returns `{ kind: 'non-interactive' }` when stdin/stdout are not
 * a TTY, so callers can distinguish that case from an interactive user
 * explicitly skipping the prompt (`{ kind: 'skipped' }`).
 */
export async function promptForAgentIds(): Promise<AgentSelectionOutcome> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return { kind: 'non-interactive' };
  }

  console.log('Select one or more agents to configure:');
  agentRegistry.forEach((agent, index) => {
    const aliases = agent.aliases?.length ? ` (aliases: ${agent.aliases.join(', ')})` : '';
    console.log(`  ${index + 1}. ${agent.id}${aliases}`);
  });

  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await input.question('\nEnter numbers/names separated by commas (e.g. 1,3 or claude,copilot), or press Enter to skip: ')).trim();
    if (!answer) {
      return { kind: 'skipped' };
    }
    return { kind: 'selected', agentIds: parseAgentSelection(answer) };
  } finally {
    input.close();
  }
}
