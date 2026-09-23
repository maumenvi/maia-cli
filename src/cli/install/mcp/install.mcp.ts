import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { McpDependency } from '../../../agent/catalog/types/dependencies/mcp.dependency.ts';
import type { MCPConfig } from '../../../agent/tools/contracts/mcp.config.ts';
import { withRollback } from '../../shared/rollback/install.rollback.ts';
import { ensureMcpEnvFileEntries } from '../mcp-credentials/ensure.mcp.env.file.entries.ts';

/** Performs the install mcp operation. */
export async function installMcp(
  store: AgentCatalogStore,
  name: string,
  source: string,
  version: string,
  allowedLlms: string[],
  vscode: MCPConfig,
): Promise<void> {
  const dependency: McpDependency = {
    version,
    source,
    enabled: true,
    capabilities: [],
    constraints: [],
    allowedLlms,
    vscode,
  };
  const lockBeforeInstall = store.loadLock();

  await withRollback([
    {
      // ensureMcpEnvFileEntries only ever adds missing credential names with
      // empty values; its undo is intentionally a no-op — it must not remove
      // entries that a prior install already relied on (see
      // contracts/install-rollback.md).
      run: () => { ensureMcpEnvFileEntries(store, vscode); },
      undo: () => {},
    },
    {
      run: () => store.addDependency('mcp', name, dependency),
      undo: () => store.removeDependency('mcp', name),
    },
    {
      run: () => store.buildLock(),
      undo: () => {
        if (lockBeforeInstall) {
          store.saveLock(lockBeforeInstall);
        }
      },
    },
  ]);
}
