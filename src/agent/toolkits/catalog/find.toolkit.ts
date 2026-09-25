import type { ToolkitDefinition } from '../contracts/toolkit.definition.ts';
import { TOOLKIT_CATALOG } from './toolkit.catalog.ts';

/** Looks a toolkit up by name in the given catalog. */
export function findToolkit(
  name: string,
  catalog: readonly ToolkitDefinition[] = TOOLKIT_CATALOG,
): ToolkitDefinition | undefined {
  return catalog.find((definition) => definition.name === name);
}
