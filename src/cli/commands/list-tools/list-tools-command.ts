import { excludeLocallyInstalled } from '../../../agent/catalog/providers/core/exclude-locally-installed.ts';
import { searchCatalog } from '../../../agent/catalog/providers/core/search-catalog.ts';
import type { CatalogSearchFailure } from '../../../agent/catalog/providers/contracts/catalog-search-failure.ts';
import type { CommandHandler } from '../../contracts/command-handler.ts';
import { discoveredLines } from './discovered-lines.ts';
import { installedLines } from './installed-lines.ts';
import { localRegistryLines } from './local-registry-lines.ts';
import { parseArgs } from './parse-args.ts';
import { printLines } from './print-lines.ts';
import { printSection } from './print-section.ts';
import { sourceFailureLines } from './source-failure-lines.ts';

/** Performs the list tools command operation. */
export const listToolsCommand: CommandHandler = async (args, { store }) => {
  const { json, query } = parseArgs(args);
  const manifest = store.loadManifest();
  const registries = Object.entries(manifest.registries).map(([id, registry]) =>
    `${id} (${registry.provider}) -> ${registry.url}`,
  );
  const installed = installedLines(store);
  const local = {
    skills: localRegistryLines('skill'),
    tools: localRegistryLines('tool'),
    mcps: localRegistryLines('mcp'),
  };

  if (json) {
    const payload: {
      kind: string;
      query: string;
      registries: string[];
      installed: string[];
      local: typeof local;
      discovered: { skills: string[]; mcps: string[] };
      sourceFailures: Array<{ provider: string; message: string }>;
      tip: string;
    } = {
      kind: 'capability-discovery',
      query,
      registries,
      installed,
      local,
      discovered: { skills: [], mcps: [] },
      sourceFailures: [],
      tip: 'maia list-tools <query>',
    };

    if (query) {
      const [skillsOutcome, mcpsOutcome] = await Promise.all([
        searchCatalog(manifest, 'skill', query, 10),
        searchCatalog(manifest, 'mcp', query, 10),
      ]);
      const skills = excludeLocallyInstalled(skillsOutcome.results, store.getInstalledPackages('skill'));
      const mcps = excludeLocallyInstalled(mcpsOutcome.results, store.getInstalledPackages('mcp'));
      payload.discovered = {
        skills: discoveredLines('skill', skills),
        mcps: discoveredLines('mcp', mcps),
      };
      const failures: CatalogSearchFailure[] = [...skillsOutcome.failures, ...mcpsOutcome.failures];
      payload.sourceFailures = failures.map((failure) => ({ provider: failure.providerId, message: failure.message }));
    }

    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log('Maia capability discovery');

  printSection('Configured registries');
  printLines(registries);

  printSection('Installed entries');
  printLines(installed);

  printSection('Local registry (skills)');
  printLines(local.skills);

  printSection('Local registry (tools)');
  printLines(local.tools);

  printSection('Local registry (mcps)');
  printLines(local.mcps);

  if (!query) {
    console.log('\nTip: run `maia list-tools <query>` to also discover skills and MCPs from configured catalogs.');
    return;
  }

  console.log('Searching skills and MCPs in the catalog... this may take a few seconds.');
  printSection(`Catalog discovery for "${query}"`);
  const [skillsOutcome, mcpsOutcome] = await Promise.all([
    searchCatalog(manifest, 'skill', query, 10),
    searchCatalog(manifest, 'mcp', query, 10),
  ]);
  const skills = excludeLocallyInstalled(skillsOutcome.results, store.getInstalledPackages('skill'));
  const mcps = excludeLocallyInstalled(mcpsOutcome.results, store.getInstalledPackages('mcp'));

  console.log('skills');
  printLines(discoveredLines('skill', skills));
  console.log('mcps');
  printLines(discoveredLines('mcp', mcps));

  const failures: CatalogSearchFailure[] = [...skillsOutcome.failures, ...mcpsOutcome.failures];
  if (failures.length > 0) {
    printSection('Sources unavailable');
    printLines(sourceFailureLines(failures));
  }
};
