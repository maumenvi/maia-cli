import { createHash } from 'node:crypto';

import { canonicalize } from './canonicalize.ts';

/** Performs the stable hash operation. */
export const stableHash = (value: unknown): string => {
  const data = JSON.stringify(canonicalize(value));
  return `sha256:${createHash('sha256').update(data).digest('hex')}`;
};
