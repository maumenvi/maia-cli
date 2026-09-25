import type { ToolkitInstallContext } from '../contracts/toolkit.install.context.ts';

/** Git source for a pinned Spec Kit release, as `uv` expects it. */
export function speckitGitSource(context: ToolkitInstallContext): string {
  return `git+${context.repository}.git@v${context.version}`;
}
