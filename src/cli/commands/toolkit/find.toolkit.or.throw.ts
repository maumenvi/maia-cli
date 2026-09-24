import { findToolkit } from '../../../agent/toolkits/catalog/find.toolkit.ts';
import { listToolkitNames } from '../../../agent/toolkits/catalog/list.toolkit.names.ts';
import type { ToolkitDefinition } from '../../../agent/toolkits/contracts/toolkit.definition.ts';

/** Returns the named toolkit or fails listing what is available (FR-004). */
export function findToolkitOrThrow(name: string, catalog: readonly ToolkitDefinition[]): ToolkitDefinition {
  const definition = findToolkit(name, catalog);
  if (!definition) {
    throw new Error(`Unknown toolkit "${name}". Available: ${listToolkitNames(catalog).join(', ')}`);
  }
  return definition;
}
