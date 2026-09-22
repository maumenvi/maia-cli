import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog-search-result.ts';
import { findCatalogProvider } from '../../../agent/catalog/providers/core/find-catalog-provider.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent-catalog-store.ts';
import { configureMcpCredentialsFromResult } from '../mcp-credentials/configure-mcp-credentials-from-result.ts';
import { installMcp } from '../mcp/install-mcp.ts';
import { installSkill } from '../skill/install-skill.ts';

/** Performs the install catalog result operation. */
export async function installCatalogResult(
  store: AgentCatalogStore,
  result: CatalogSearchResult,
  allowedLlms: string[] = ['*'],
): Promise<void> {
  const manifest = store.loadManifest();
  const provider = findCatalogProvider(manifest, result.provider);
  const resolved = await provider.resolve(result);
  store.addSource(resolved.sourceAlias, resolved.source);

  if (result.kind === 'skill') {
    await installSkill(store, {
      name: result.name,
      source: resolved.sourceAlias,
      version: result.version ?? '*',
      allowedLlms,
    });
    return;
  }

  if (result.kind === 'mcp' && result.install.type === 'mcp') {
    await configureMcpCredentialsFromResult(store, result);
    await installMcp(
      store,
      result.name,
      resolved.sourceAlias,
      result.version ?? '*',
      allowedLlms,
      result.install.vscode,
    );
    return;
  }

  throw new Error(`External installation is not supported for ${result.kind}`);
}
