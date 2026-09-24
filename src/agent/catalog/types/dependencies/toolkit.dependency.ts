import type { ToolkitScope } from '../../../toolkits/contracts/toolkit.scope.ts';

/** A toolkit declared in `maia.json`; `version` is always exact (`^\d+\.\d+\.\d+$`). */
export interface ToolkitDependency {
  version: string;
  scope: ToolkitScope;
}
