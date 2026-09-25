import type { ToolkitInstallState } from '../contracts/toolkit.install.state.ts';
import type { ToolkitScope } from '../contracts/toolkit.scope.ts';
import { normalizeToolkitVersion } from './normalize.toolkit.version.ts';

/** Classifies what was detected on disk against the expected version (data-model §5). */
export function classifyToolkitState(input: {
  expectedVersion: string;
  scope: ToolkitScope;
  projectVersion: string | null;
  globalToolVersion: string | null;
}): ToolkitInstallState {
  const expected = normalizeToolkitVersion(input.expectedVersion);
  if (input.projectVersion === null) {
    return 'absent';
  }
  if (normalizeToolkitVersion(input.projectVersion) !== expected) {
    return 'mismatch';
  }
  if (input.scope === 'global'
    && (input.globalToolVersion === null || normalizeToolkitVersion(input.globalToolVersion) !== expected)) {
    return 'global-tool-missing';
  }
  return 'installed';
}
