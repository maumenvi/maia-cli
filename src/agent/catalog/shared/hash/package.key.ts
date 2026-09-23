import type { CatalogKind } from '../../types/kinds.ts';

/** Performs the package key operation. */
export const packageKey = (kind: CatalogKind, name: string): string => `${kind}:${name}`;
