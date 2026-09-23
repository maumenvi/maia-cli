import { agentRegistry } from '../../../agent/agents/registry/agent.registry.ts';
import type { CommandHandler } from '../../contracts/command.handler.ts';
import { configureAgents } from './configure.agents.ts';
import { supportedAgentsMessage } from './supported.agents.message.ts';

/** Performs the agent command operation. */
export const agentCommand: CommandHandler = async (args, { store }) => {
  const remaining = args;
  const action = remaining[0];

  if (action === 'agent') {
    const agentIds = remaining.slice(1);
    if (agentIds.length === 0) {
      const ids = supportedAgentsMessage();
      throw new Error(`Usage: maia add agent <name...>\nSupported agents: ${ids}`);
    }
    store.saveSelectedAgents(agentIds);
    configureAgents(store, agentIds);
    return;
  }

  if (action === 'add') {
    const agentIds = remaining.slice(1);
    if (agentIds.length === 0) {
      const ids = supportedAgentsMessage();
      throw new Error(`Usage: maia agent add <name...>\nSupported agents: ${ids}`);
    }
    store.saveSelectedAgents(agentIds);
    configureAgents(store, agentIds);
    return;
  }

  if (action && action !== 'ls' && action !== 'list') {
    store.saveSelectedAgents(remaining);
    configureAgents(store, remaining);
    return;
  }

  if (action === 'ls' || action === 'list') {
    console.log('Supported agents:');
    for (const agent of agentRegistry) {
      const aliases = agent.aliases?.length ? ` (aliases: ${agent.aliases.join(', ')})` : '';
      console.log(`  ${agent.id}${aliases}`);
    }
    return;
  }

  throw new Error('Usage: maia agent add <name...> | maia add agent <name...> | maia add <name...> | maia agent ls');
};
