import type { CatalogProvider } from '../contracts/catalog.provider.ts';
import type { CatalogSearchResult } from '../contracts/catalog.search.result.ts';
import type { ResolvedCatalogEntry } from '../contracts/resolved.catalog.entry.ts';
import { collectCredentialHints } from './collect.credential.hints.ts';
import type { FetchFn } from './fetch.fn.ts';
import { fetchWithTimeout } from './fetch.with.timeout.ts';
import { normalizeBaseUrl } from './normalize.base.url.ts';
import type { RegistryResponse } from './registry.response.ts';
import { resolveMcpConfig } from './resolve.mcp.config.ts';
import { unwrapServer } from './unwrap.server.ts';

/** Coordinates the mcp registry provider behavior. */
export class McpRegistryProvider implements CatalogProvider {
  readonly id: string;
  readonly kinds = ['mcp'] as const;
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;

  /** Initializes a new McpRegistryProvider instance. */
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
    const params = new URLSearchParams({
      search: query.trim(),
      version: 'latest',
      limit: String(limit),
    });
    const response = await fetchWithTimeout(this.fetchFn, `${this.baseUrl}/v0.1/servers?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`MCP Registry search failed (${response.status})`);
    }

    const payload = await response.json() as RegistryResponse;
    return (payload.servers ?? []).flatMap((entry) => {
      const server = unwrapServer(entry);
      const vscode = resolveMcpConfig(server);
      if (!server.name || !vscode) {
        return [];
      }
      const npmCredentials = server.packages?.flatMap((item) => collectCredentialHints(item.environmentVariables, server.name, server.repository?.url)) ?? [];
      const remoteCredentials = server.remotes?.flatMap((item) => collectCredentialHints(item.headers, server.name, server.repository?.url || item.url)) ?? [];
      const credentials = [...npmCredentials, ...remoteCredentials].filter((value, index, values) =>
        values.findIndex((candidate) => candidate.name === value.name && candidate.sourceUrl === value.sourceUrl) === index,
      );
      return [{
        id: server.name,
        kind: 'mcp' as const,
        name: server.name,
        displayName: server.title || server.name,
        description: server.description,
        provider: this.id,
        source: server.repository?.url || this.baseUrl,
        version: server.version,
        ...(credentials.length > 0 ? { credentials } : {}),
        install: { type: 'mcp' as const, vscode },
      }];
    });
  }

  /** Performs the resolve operation. */
  async resolve(result: CatalogSearchResult): Promise<ResolvedCatalogEntry> {
    if (result.kind !== 'mcp' || result.install.type !== 'mcp') {
      throw new Error(`Provider "${this.id}" cannot resolve this entry`);
    }
    return {
      result,
      sourceAlias: this.id,
      source: {
        type: 'registry',
        url: this.baseUrl,
        ref: 'v0.1',
        trusted: true,
      },
    };
  }
}
