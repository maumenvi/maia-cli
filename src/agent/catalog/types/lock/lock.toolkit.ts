import type { ToolkitScope } from '../../../toolkits/contracts/toolkit.scope.ts';

/** A toolkit pinned in `maia.lock.json`, derived purely from the manifest and catalog. */
export interface LockToolkit {
  name: string;
  version: string;
  scope: ToolkitScope;
  source: string;
  ref: string;
  integrations: string[];
  paths: string[];
}
