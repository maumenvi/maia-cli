import { config } from '../../../../config/core/config.ts';
import type { CatalogKind } from '../../types/kinds.ts';

/** Performs the registry root for kind operation. */
export const registryRootForKind = (kind: CatalogKind): string => {
  if (kind === 'skill') return config.paths.skillsRoot;
  if (kind === 'mcp') return config.paths.mcpRoot;
  return config.paths.toolsRoot;
};
