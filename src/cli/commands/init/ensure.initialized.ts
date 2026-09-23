import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { migrateLegacyCatalogFiles } from '../../../agent/catalog/paths/migrate.legacy.catalog.files.ts';
import { ensureMcpEnvFile } from '../../../config/core/ensure.mcp.env.file.ts';
import { migrateLegacyMcpEnvFile } from '../../install/mcp-credentials/migrate.legacy.mcp.env.file.ts';

/** Performs the ensure initialized operation. */
export function ensureInitialized(store: AgentCatalogStore): void {
  const paths = store.getPaths();
  migrateLegacyCatalogFiles(paths);
  migrateLegacyMcpEnvFile(paths.projectRoot, paths.mcpEnv);
  ensureMcpEnvFile(paths.mcpEnv);

  const manifest = store.loadManifest();
  store.saveManifest(manifest);
  if (!store.loadLock()) {
    store.buildLock();
  }
}
