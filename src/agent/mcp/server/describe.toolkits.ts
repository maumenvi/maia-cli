import type { AgentCatalogStore } from '../../catalog/store/agent.catalog.store.ts';
import { findToolkit } from '../../toolkits/catalog/find.toolkit.ts';
import { listToolkitNames } from '../../toolkits/catalog/list.toolkit.names.ts';
import { toToolkitView } from '../../toolkits/view/to.toolkit.view.ts';
import type { McpCallToolResult } from '../runtime/protocol/json-rpc/mcp.call.tool.result.ts';

/** Answers a `maia_toolkits` call from the catalog and the lockfile; never installs anything. */
export function describeToolkits(catalog: AgentCatalogStore, name?: unknown): McpCallToolResult {
  const toolkitCatalog = catalog.getToolkitCatalog();
  const locked = catalog.loadLock()?.toolkits ?? {};
  if (typeof name === 'string' && !findToolkit(name, toolkitCatalog)) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Unknown toolkit "${name}". Available: ${listToolkitNames(toolkitCatalog).join(', ')}` }],
    };
  }
  const toolkits = toolkitCatalog
    .filter((definition) => typeof name !== 'string' || definition.name === name)
    .map((definition) => toToolkitView(definition, locked[definition.name]));
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        toolkits,
        note: 'Maia MCP does not install toolkits. Use the CLI command shown or the toolkit docs.',
      }),
    }],
  };
}
