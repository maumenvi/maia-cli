import { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { CliContext } from '../../contracts/cli.context.ts';
import { catalogResultTrust } from '../../install/external/catalog.result.trust.ts';
import { chooseCatalogResult } from '../../install/external/choose.catalog.result.ts';
import { installCatalogResult } from '../../install/external/install.catalog.result.ts';
import { parseFlags } from '../../shared/flags/parse.flags.ts';
import { DEFAULT_INTERACTION } from '../../shared/terminal/default.interaction.ts';
import { restoreConfiguredAgents } from '../init/restore.configured.agents.ts';
import { directGitHubResult } from './direct.git.hub.result.ts';
import { discoverSkillsFromStore } from './discover.skills.from.store.ts';
import type { SpawnFn } from './spawn.fn.ts';
import { warnAboutNativeCommandCollisions } from './warn.about.native.command.collisions.ts';

/** Performs the run skills cli operation. */
export async function runSkillsCli(
  args: string[],
  _spawnFn: SpawnFn = (() => { throw new Error('npx is not used by maia skills'); }) as SpawnFn,
  _quiet = false,
  context?: Partial<CliContext>,
): Promise<number> {
  const store = context?.store ?? new AgentCatalogStore({ cwd: process.cwd() });
  const interaction = context?.interaction ?? DEFAULT_INTERACTION;
  const [command, ...rest] = args;
  const { positional, flags } = parseFlags(rest);
  const trustOf = (result: Parameters<typeof catalogResultTrust>[1]) => catalogResultTrust(store.loadManifest(), result);

  if (command === 'find') {
    const results = await discoverSkillsFromStore(store, positional.join(' '));
    if (results.length === 0) {
      console.log('No skills were found for the provided search.');
      return 0;
    }
    const selected = await interaction.select(results, { trustOf });
    if (!selected) {
      return 0;
    }
    await installCatalogResult(store, selected, { flags, interaction });
    console.log(`Installed skill:${selected.name}`);
    await restoreConfiguredAgents(store);
    return 0;
  }

  if (command === 'add' || command === 'install') {
    const target = positional[0];
    if (!target) {
      throw new Error('Usage: maia skills add <skill-name|owner/repo@skill>');
    }
    const localName = flags.as;
    if (localName === 'true') {
      throw new Error('Usage: maia skills add <skill-name|owner/repo@skill> --as <name>');
    }
    if (localName !== undefined && !/^[A-Za-z0-9._-]+$/.test(localName)) {
      throw new Error(`Invalid skill name "${localName}"`);
    }
    const selected = directGitHubResult(store, target) ?? await chooseCatalogResult({
      query: target,
      results: await discoverSkillsFromStore(store, target),
      interaction,
      trustOf,
      notFound: `Skill "${target}" was not found in configured catalogs`,
    });
    if (!selected) {
      return 0;
    }
    await installCatalogResult(store, selected, { flags, interaction, localName });
    const installedName = localName ?? selected.name;
    console.log(localName && localName !== selected.name
      ? `Installed skill:${localName} (from ${selected.name})`
      : `Installed skill:${installedName}`);
    warnAboutNativeCommandCollisions(store, installedName);
    await restoreConfiguredAgents(store);
    return 0;
  }

  throw new Error('Usage: maia skills find <query> | maia skills add <skill-name|owner/repo@skill>');
}
