import path from 'node:path';

import type { CatalogKind } from '../../types/kinds.ts';
import { registryRootForKind } from './registry.root.for.kind.ts';

/** Performs the registry file for kind operation. */
export const registryFileForKind = (kind: CatalogKind): string => path.resolve(registryRootForKind(kind), 'registry.json');
