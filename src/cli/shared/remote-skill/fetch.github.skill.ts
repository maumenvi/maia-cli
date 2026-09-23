import { parseGitHubRepository } from '../../../agent/catalog/providers/github/parse.git.hub.repository.ts';
import type { CatalogSource } from '../../../agent/catalog/types/source/catalog.source.ts';
import { discoverGitHubSkillPath } from './discover.github.skill.path.ts';
import { fetchText } from './fetch.text.ts';

/** Fetches a skill from GitHub using its raw-content and tree APIs. */
export async function fetchGitHubSkill(source: CatalogSource, name: string): Promise<string | null> {
  const repository = parseGitHubRepository(source.url);
  if (!repository) {
    return null;
  }

  const ref = source.ref ?? 'main';
  const defaultPath = `skills/${name}/SKILL.md`;
  const rawRoot = `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/${ref}`;
  const defaultSkill = await fetchText(`${rawRoot}/${defaultPath}`);
  if (defaultSkill !== null) {
    return defaultSkill;
  }

  const discoveredPath = await discoverGitHubSkillPath(repository.owner, repository.repo, ref, name);
  return discoveredPath ? fetchText(`${rawRoot}/${discoveredPath}`) : null;
}

