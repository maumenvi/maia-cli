import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { ToolkitDefinition } from '../../../agent/toolkits/contracts/toolkit.definition.ts';
import type { ToolkitInstallState } from '../../../agent/toolkits/contracts/toolkit.install.state.ts';
import type { ToolkitScope } from '../../../agent/toolkits/contracts/toolkit.scope.ts';
import { classifyToolkitState } from '../../../agent/toolkits/plan/classify.toolkit.state.ts';
import type { ToolkitIo } from './toolkit.io.ts';

/** Reads the toolkit's installed versions from disk and PATH and classifies them. */
export function detectToolkitState(
  definition: ToolkitDefinition,
  expected: { version: string; scope: ToolkitScope },
  projectRoot: string,
  io: Pick<ToolkitIo, 'runner'>,
): { state: ToolkitInstallState; projectVersion: string | null; globalToolVersion: string | null } {
  const versionFile = path.resolve(projectRoot, definition.projectVersionFile);
  const projectVersion = existsSync(versionFile)
    ? definition.parseProjectVersion(readFileSync(versionFile, 'utf8'))
    : null;

  let globalToolVersion: string | null = null;
  if (expected.scope === 'global') {
    const result = io.runner(definition.commands.globalToolVersion(), { cwd: projectRoot, interactive: false });
    globalToolVersion = result.status === 0 ? definition.parseGlobalToolVersion(result.stdout) : null;
  }

  return {
    state: classifyToolkitState({ expectedVersion: expected.version, scope: expected.scope, projectVersion, globalToolVersion }),
    projectVersion,
    globalToolVersion,
  };
}
