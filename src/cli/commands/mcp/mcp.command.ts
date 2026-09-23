import type { CommandHandler } from '../../contracts/command.handler.ts';
import { bestCatalogMatch } from '../../install/external/best.catalog.match.ts';
import { installCatalogResult } from '../../install/external/install.catalog.result.ts';
import { selectCatalogResult } from '../../shared/select/select.catalog.result.ts';
import { restoreConfiguredAgents } from '../init/restore.configured.agents.ts';
import { discoverMcpsFromStore } from './discover.mcps.from.store.ts';
import { warnWhenNoAgentConfigured } from './warn.when.no.agent.configured.ts';

/** Performs the mcp command operation. */
export const mcpCommand: CommandHandler = async (args, { store }) => {
  const action = args[0];
  if (action === 'sync') {
    const result = store.syncVsCodeMcp();
    console.log(`Synced ${Object.keys(result.servers).length} MCP server(s) to ${result.file}`);
    return;
  }

  if (action === 'find') {
    const results = await discoverMcpsFromStore(store, args.slice(1).join(' '));
    if (results.length === 0) {
      console.log('No MCPs were found for the provided search.');
      return;
    }
    const selected = await selectCatalogResult(results);
    if (selected) {
      await installCatalogResult(store, selected);
      console.log(`Installed mcp:${selected.name}`);
      // Installing must leave the MCP ready to use, so push it into every
      // configured agent instead of waiting for a separate sync.
      restoreConfiguredAgents(store);
      const warning = warnWhenNoAgentConfigured(store);
      if (warning) console.warn(warning);
    }
    return;
  }

  if (action === 'add' || action === 'install') {
    const query = args.slice(1).join(' ');
    if (!query) {
      throw new Error('Usage: maia mcp add <name>');
    }
    const selected = bestCatalogMatch(await discoverMcpsFromStore(store, query), query);
    if (!selected) {
      throw new Error(`MCP "${query}" was not found in configured catalogs`);
    }
    await installCatalogResult(store, selected);
    console.log(`Installed mcp:${selected.name}`);
    restoreConfiguredAgents(store);
    const warning = warnWhenNoAgentConfigured(store);
    if (warning) console.warn(warning);
    return;
  }

  throw new Error('Usage: maia mcp sync | maia mcp find <query> | maia mcp add <name>');
};
