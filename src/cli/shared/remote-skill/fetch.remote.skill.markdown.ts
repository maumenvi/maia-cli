import { parseGitHubRepository } from '../../../agent/catalog/providers/github/parse.git.hub.repository.ts';
import type { CatalogSource } from '../../../agent/catalog/types/source/catalog.source.ts';
import { fetchGitSkill } from './fetch.git.skill.ts';
import { fetchGitHubSkill } from './fetch.github.skill.ts';
import { fetchWellKnownSkill } from './fetch.well.known.skill.ts';

const SKILL_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

/** Resolves remote skill Markdown through the source-specific backend. */
export async function fetchRemoteSkillMarkdown(source: CatalogSource, name: string): Promise<string | null> {
  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid skill name "${name}"`);
  }
  if (source.type === 'git') {
    return parseGitHubRepository(source.url)
      ? fetchGitHubSkill(source, name)
      : fetchGitSkill(source, name);
  }
  if (source.type === 'well-known') {
    return fetchWellKnownSkill(source, name);
  }
  return null;
}
