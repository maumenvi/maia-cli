import type { LockToolkit } from '../../catalog/types/lock/lock.toolkit.ts';
import type { ToolkitDefinition } from '../contracts/toolkit.definition.ts';
import type { ToolkitView } from '../contracts/toolkit.view.ts';

/** Describes a catalog toolkit, adding install details when the lock pins it. */
export function toToolkitView(definition: ToolkitDefinition, lockEntry?: LockToolkit): ToolkitView {
  return {
    name: definition.name,
    title: definition.title,
    description: definition.description,
    docsUrl: definition.docsUrl,
    supportsGlobal: definition.supportsGlobal,
    installed: Boolean(lockEntry),
    ...(lockEntry
      ? {
          version: lockEntry.version,
          scope: lockEntry.scope,
          integrations: lockEntry.integrations,
          paths: lockEntry.paths,
        }
      : {}),
    installCommand: `maia toolkit i ${definition.name}`,
  };
}
