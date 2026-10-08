import type { CommandHandler } from '../../contracts/command.handler.ts';
import { catalogResultTrust } from '../../install/external/catalog.result.trust.ts';
import { chooseCatalogResult } from '../../install/external/choose.catalog.result.ts';
import { installCatalogResult } from '../../install/external/install.catalog.result.ts';
import { normalizeLegacyFlags } from '../../shared/flags/normalize.legacy.flags.ts';
import { parseFlags } from '../../shared/flags/parse.flags.ts';
import { DEFAULT_INTERACTION } from '../../shared/terminal/default.interaction.ts';
import { restoreConfiguredAgents } from '../init/restore.configured.agents.ts';
import { discoverMcpsFromStore } from './discover.mcps.from.store.ts';
import { warnWhenNoAgentConfigured } from './warn.when.no.agent.configured.ts';

/** Performs the mcp command operation. */
export const mcpCommand: CommandHandler = async (args, { store, interaction = DEFAULT_INTERACTION }) => {
  const action = args[0];
  const { positional, flags } = parseFlags(normalizeLegacyFlags(args.slice(1)));
  const envScope = flags['env-g'] === 'true' ? 'global' : 'project';
  const query = positional.join(' ');
  const trustOf = (result: Parameters<typeof catalogResultTrust>[1]) => catalogResultTrust(store.loadManifest(), result);

  if (action === 'sync') {
    const result = store.syncVsCodeMcp();
    console.log(`Synced ${Object.keys(result.servers).length} MCP server(s) to ${result.file}`);
    return;
  }

  if (action === 'find' || action === 'add' || action === 'install' || action === 'i') {
    if (!query) {
      throw new Error(action === 'find' ? 'Usage: maia mcp find <query>' : 'Usage: maia mcp add <name>');
    }
    const results = await discoverMcpsFromStore(store, query);
    if (action === 'find' && results.length === 0) {
      console.log('No MCPs were found for the provided search.');
      return;
    }
    // find always lets the user pick; add/install only asks when the name is not exact.
    const selected = action === 'find'
      ? await interaction.select(results, { trustOf })
      : await chooseCatalogResult({
        query,
        results,
        interaction,
        trustOf,
        notFound: `MCP "${query}" was not found in configured catalogs`,
      });
    if (!selected) {
      return;
    }
    await installCatalogResult(store, selected, { flags, interaction, envScope });
    console.log(`Installed mcp:${selected.name}`);
    // Installing must leave the MCP ready to use, so push it into every
    // configured agent instead of waiting for a separate sync.
    await restoreConfiguredAgents(store);
    const warning = warnWhenNoAgentConfigured(store);
    if (warning) console.warn(warning);
    return;
  }

  throw new Error('Usage: maia mcp sync | maia mcp find <query> [--env-g] | maia mcp i|add|install <name> [--env-g]');
};
