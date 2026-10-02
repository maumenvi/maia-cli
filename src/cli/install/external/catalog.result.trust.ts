import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';
import type { SourcesManifest } from '../../../agent/catalog/types/manifest/sources.manifest.ts';

/**
 * Trust of a catalog result before it is resolved, for display only: a source
 * already declared in maia.json keeps its trust; otherwise skills from public
 * repositories are untrusted and MCP registry entries are trusted.
 */
export function catalogResultTrust(manifest: SourcesManifest, result: CatalogSearchResult): boolean {
  const alias = result.install.type === 'github'
    ? `github:${result.install.repository.toLowerCase()}`
    : result.install.type === 'well-known'
      ? `well-known:${new URL(result.install.baseUrl).host.toLowerCase()}`
      : result.provider;
  const declared = manifest.sources[alias];
  if (declared) return declared.trusted === true;
  return result.install.type === 'mcp';
}
