import { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { installCatalogResult } from '../../install/external/install.catalog.result.ts';
import { selectCatalogResult } from '../../shared/select/select.catalog.result.ts';
import { directGitHubResult } from './direct.git.hub.result.ts';
import { discoverSkillsFromStore } from './discover.skills.from.store.ts';
import { isMissingSkillInSourceError } from './is.missing.skill.in.source.error.ts';
import { orderedByBestMatch } from './ordered.by.best.match.ts';
import type { SpawnFn } from './spawn.fn.ts';

/** Performs the run skills cli operation. */
export async function runSkillsCli(
  args: string[],
  _spawnFn: SpawnFn = (() => { throw new Error('npx is not used by maia skills'); }) as SpawnFn,
  _quiet = false,
  context?: { store: AgentCatalogStore },
): Promise<number> {
  const store = context?.store ?? new AgentCatalogStore({ cwd: process.cwd() });
  const [command, ...rest] = args;

  if (command === 'find') {
    let results = await discoverSkillsFromStore(store, rest.join(' '));
    if (results.length === 0) {
      console.log('No skills were found for the provided search.');
      return 0;
    }
    while (results.length > 0) {
      const selected = await selectCatalogResult(results);
      if (!selected) {
        return 0;
      }
      try {
        await installCatalogResult(store, selected);
        console.log(`Installed skill:${selected.name}`);
        return 0;
      } catch (error) {
        if (!isMissingSkillInSourceError(error)) {
          throw error;
        }
        console.log(`Skill unavailable from source (${selected.source}). Choose another option.`);
        results = results.filter((entry) => entry.id !== selected.id);
      }
    }
    console.log('No installable skills were found for the provided search.');
    return 0;
  }

  if (command === 'add' || command === 'install') {
    const target = rest[0];
    if (!target) {
      throw new Error('Usage: maia skills add <skill-name|owner/repo@skill>');
    }
    const direct = directGitHubResult(store, target);
    if (direct) {
      await installCatalogResult(store, direct);
      console.log(`Installed skill:${direct.name}`);
      return 0;
    }

    const orderedCandidates = orderedByBestMatch(await discoverSkillsFromStore(store, target), target);
    if (orderedCandidates.length === 0) {
      throw new Error(`Skill "${target}" was not found in configured catalogs`);
    }

    let missingCount = 0;
    for (const selected of orderedCandidates) {
      try {
        await installCatalogResult(store, selected);
        console.log(`Installed skill:${selected.name}`);
        return 0;
      } catch (error) {
        if (!isMissingSkillInSourceError(error)) {
          throw error;
        }
        missingCount += 1;
      }
    }

    if (missingCount > 0) {
      throw new Error(`Skill "${target}" has catalog entries, but none are currently installable from their sources`);
    }
    throw new Error(`Skill "${target}" was not found in configured catalogs`);
    return 0;
  }

  throw new Error('Usage: maia skills find <query> | maia skills add <skill-name|owner/repo@skill>');
}
