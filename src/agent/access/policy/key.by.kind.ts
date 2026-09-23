import type { AccessResourceKind } from './access.resource.kind.ts';
import type { PolicyKey } from './policy.key.ts';

/** Defines the key by kind value. */
export const keyByKind: Record<AccessResourceKind, PolicyKey> = {
  tool: 'tools',
  skill: 'skills',
  mcp: 'mcps',
};
