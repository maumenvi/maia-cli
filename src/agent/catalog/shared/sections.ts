import type { CatalogKind } from '../types/kinds.ts';
import type { SourcesManifest } from '../types/manifest/sources.manifest.ts';

/** Performs the dependency section for kind operation. */
export const dependencySectionForKind = (kind: CatalogKind): keyof Pick<SourcesManifest, 'skills' | 'mcps' | 'tools'> => {
  if (kind === 'skill') return 'skills';
  if (kind === 'mcp') return 'mcps';
  return 'tools';
};
