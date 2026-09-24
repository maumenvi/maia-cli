import type { ToolkitScope } from './toolkit.scope.ts';

/** Inputs a toolkit needs to build its native installer commands. */
export interface ToolkitInstallContext {
  version: string;
  scope: ToolkitScope;
  integrations: string[];
  platform: NodeJS.Platform;
  repository: string;
  /** True when the global tool is already present at the wanted version. */
  globalToolReady?: boolean;
}
