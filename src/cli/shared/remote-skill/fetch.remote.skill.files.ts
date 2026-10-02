import { parseGitHubRepository } from '../../../agent/catalog/providers/github/parse.git.hub.repository.ts';
import type { CatalogSource } from '../../../agent/catalog/types/source/catalog.source.ts';
import { fetchGitHubSkillFiles } from './fetch.github.skill.files.ts';
import { fetchGitSkillFiles } from './fetch.git.skill.files.ts';
import { fetchWellKnownSkillFiles } from './fetch.well.known.skill.files.ts';
import type { SkillFiles } from './skill.files.ts';
import { validateSkillFiles } from './validate.skill.files.ts';

const SKILL_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

/** Fetches and validates a whole skill folder through the source-specific backend. */
export async function fetchRemoteSkillFiles(source: CatalogSource, name: string): Promise<SkillFiles | null> {
  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid skill name "${name}"`);
  }
  let files: SkillFiles | null = null;
  if (source.type === 'git') {
    files = parseGitHubRepository(source.url)
      ? await fetchGitHubSkillFiles(source, name)
      : await fetchGitSkillFiles(source, name);
  } else if (source.type === 'well-known') {
    files = await fetchWellKnownSkillFiles(source, name);
  }
  return files === null ? null : validateSkillFiles(name, files, source.url);
}
