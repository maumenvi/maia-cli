import type { ToolkitDefinition } from '../contracts/toolkit.definition.ts';
import { TOOLKIT_CATALOG } from './toolkit.catalog.ts';

/** Lists the catalog's toolkit names, sorted. */
export function listToolkitNames(catalog: readonly ToolkitDefinition[] = TOOLKIT_CATALOG): string[] {
  return catalog.map((definition) => definition.name).sort();
}
