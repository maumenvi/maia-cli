import type { ToolkitDefinition } from '../contracts/toolkit.definition.ts';
import type { ToolkitScope } from '../contracts/toolkit.scope.ts';

/** Resolves `-g` against the toolkit's support; unsupported means project scope plus a warning (FR-012). */
export function resolveEffectiveScope(
  definition: ToolkitDefinition,
  requestedGlobal: boolean,
): { scope: ToolkitScope; warning?: string } {
  if (!requestedGlobal) {
    return { scope: 'project' };
  }
  if (definition.supportsGlobal) {
    return { scope: 'global' };
  }
  return {
    scope: 'project',
    warning: `${definition.name} does not support global installation; installing in the project`,
  };
}
