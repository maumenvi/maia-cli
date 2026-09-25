import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { toToolkitView } from '../../../agent/toolkits/view/to.toolkit.view.ts';
import type { ToolkitIo } from './toolkit.io.ts';

/** `maia toolkit ls`: one line per catalog toolkit, or the views as JSON (FR-005). */
export function listToolkits(store: AgentCatalogStore, options: { json: boolean }, io: Pick<ToolkitIo, 'catalog'>): void {
  const locked = store.loadLock()?.toolkits ?? {};
  const views = io.catalog.map((definition) => toToolkitView(definition, locked[definition.name]));
  if (options.json) {
    console.log(JSON.stringify(views, null, 2));
    return;
  }
  for (const view of views) {
    const status = view.installed ? `installed ${view.version} (${view.scope})` : 'not installed';
    console.log(`${view.name}  ${view.title}  global:${view.supportsGlobal ? 'yes' : 'no'}  ${status}`);
  }
}
