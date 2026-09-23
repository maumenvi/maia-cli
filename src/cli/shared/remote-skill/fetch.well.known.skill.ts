import type { CatalogSource } from '../../../agent/catalog/types/source/catalog.source.ts';
import { fetchText } from './fetch.text.ts';

/** Fetches a skill from the standardized `.well-known` locations. */
export async function fetchWellKnownSkill(source: CatalogSource, name: string): Promise<string | null> {
  const baseUrl = source.url.replace(/\/+$/, '');
  for (const directory of ['agent-skills', 'skills']) {
    const markdown = await fetchText(`${baseUrl}/.well-known/${directory}/${name}/SKILL.md`);
    if (markdown !== null) {
      return markdown;
    }
  }
  return null;
}

