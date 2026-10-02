import type { CatalogSearchResult } from '../../../agent/catalog/providers/contracts/catalog.search.result.ts';
import { findCatalogProvider } from '../../../agent/catalog/providers/core/find.catalog.provider.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { DEFAULT_INTERACTION } from '../../shared/terminal/default.interaction.ts';
import { configureMcpCredentialsFromResult } from '../mcp-credentials/configure.mcp.credentials.from.result.ts';
import { installMcp } from '../mcp/install.mcp.ts';
import { installSkill } from '../skill/install.skill.ts';
import { formatCatalogIdentifier } from './format.catalog.identifier.ts';
import type { InstallCatalogOptions } from './install.catalog.options.ts';
import { resolveCatalogAuthorization } from './resolve.catalog.authorization.ts';
import { resolveEffectiveTrust } from './resolve.effective.trust.ts';

/**
 * Installs one catalog result. Agents are authorized according to the source's
 * trust: a trusted source (or explicit --all-llms/--llms) is open to every
 * agent; an untrusted one needs the user's consent and stays closed without it.
 */
export async function installCatalogResult(
  store: AgentCatalogStore,
  result: CatalogSearchResult,
  options: InstallCatalogOptions = {},
): Promise<void> {
  const manifest = store.loadManifest();
  const provider = findCatalogProvider(manifest, result.provider);
  const resolved = await provider.resolve(result);
  const trusted = resolveEffectiveTrust(manifest, resolved.sourceAlias, resolved.source.trusted ?? false);
  const interaction = options.interaction ?? DEFAULT_INTERACTION;
  const allowedLlms = await resolveCatalogAuthorization(result, trusted, options.flags ?? {}, interaction);

  // Never downgrade or upgrade the trust a user already declared for this source.
  const declared = manifest.sources[resolved.sourceAlias];
  store.addSource(resolved.sourceAlias, declared ? { ...resolved.source, trusted: declared.trusted } : resolved.source);

  if (result.kind === 'skill') {
    await installSkill(store, {
      name: result.name,
      source: resolved.sourceAlias,
      version: result.version ?? '*',
      allowedLlms,
    });
  } else if (result.kind === 'mcp' && result.install.type === 'mcp') {
    await configureMcpCredentialsFromResult(store, result);
    await installMcp(
      store,
      result.name,
      resolved.sourceAlias,
      result.version ?? '*',
      allowedLlms,
      result.install.vscode,
    );
  } else {
    throw new Error(`External installation is not supported for ${result.kind}`);
  }

  if (!trusted && allowedLlms.length === 0) {
    const command = result.kind === 'skill' ? 'skills' : 'mcp';
    console.log(
      `Installed ${result.kind}:${result.name} without agent access (untrusted source). `
      + `Run "maia ${command} add ${formatCatalogIdentifier(result)} --all-llms" to authorize it.`,
    );
  }
}
