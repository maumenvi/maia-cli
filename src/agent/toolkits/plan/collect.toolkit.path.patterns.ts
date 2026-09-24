import type { ToolkitDefinition } from '../contracts/toolkit.definition.ts';

/** Lists the path patterns a toolkit owns for the given integrations, without duplicates. */
export function collectToolkitPathPatterns(definition: ToolkitDefinition, integrations: string[]): string[] {
  const patterns = [
    ...definition.projectPaths,
    ...integrations.flatMap((key) => definition.integrationPaths[key] ?? []),
  ];
  return [...new Set(patterns)];
}
