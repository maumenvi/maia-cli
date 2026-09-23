import type { CatalogProvider } from '../contracts/catalog.provider.ts';
import type { CatalogSearchResult } from '../contracts/catalog.search.result.ts';
import type { ResolvedCatalogEntry } from '../contracts/resolved.catalog.entry.ts';
import { resolveGitHubSource } from '../github/resolve.git.hub.source.ts';
import { cleanText } from './clean.text.ts';
import type { FetchFn } from './fetch.fn.ts';
import type { GitHubCodeSearchResponse } from './git.hub.code.search.response.ts';
import { normalizeBaseUrl } from './normalize.base.url.ts';
import { parseSkillNameFromPath } from './parse.skill.name.from.path.ts';

/** Coordinates the git hub skills provider behavior. */
export class GitHubSkillsProvider implements CatalogProvider {
  readonly id: string;
  readonly kinds = ['skill'] as const;
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;

  /** Initializes a new GitHubSkillsProvider instance. */
  constructor(
    id: string,
    baseUrl: string,
    fetchFn: FetchFn = fetch,
  ) {
    this.id = id;
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.fetchFn = fetchFn;
  }

  /** Performs the search operation. */
  async search(query: string, limit = 10): Promise<CatalogSearchResult[]> {
    const trimmedQuery = query.trim();
    const q = trimmedQuery ? `${trimmedQuery} filename:SKILL.md` : 'filename:SKILL.md';
    const params = new URLSearchParams({ q, per_page: String(limit) });
    const response = await this.fetchFn(`${this.baseUrl}/search/code?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`GitHub skills search failed (${response.status})`);
    }

    const payload = await response.json() as GitHubCodeSearchResponse;
    const deduped = new Map<string, CatalogSearchResult>();
    for (const item of payload.items ?? []) {
      const source = cleanText(item.repository?.full_name);
      const path = cleanText(item.path);
      const name = parseSkillNameFromPath(path);
      if (!source || !name) {
        continue;
      }

      const id = `${source}/${name}`;
      deduped.set(id, {
        id,
        kind: 'skill',
        name,
        displayName: name,
        provider: this.id,
        source,
        install: { type: 'github', repository: source, skill: name },
      });
    }

    return Array.from(deduped.values());
  }

  /** Performs the resolve operation. */
  async resolve(result: CatalogSearchResult): Promise<ResolvedCatalogEntry> {
    if (result.kind !== 'skill' || result.install.type !== 'github') {
      throw new Error(`Provider "${this.id}" cannot resolve this entry`);
    }

    return {
      result,
      sourceAlias: `github:${result.install.repository.toLowerCase()}`,
      source: await resolveGitHubSource(result.install.repository, this.fetchFn),
    };
  }
}
