import type { ToolkitDefinition } from '../../../agent/toolkits/contracts/toolkit.definition.ts';
import type { ToolkitIo } from './toolkit.io.ts';

/** Fails before anything is written when a prerequisite of the native installer is missing (FR-007). */
export function checkToolkitPrerequisites(
  definition: ToolkitDefinition,
  cwd: string,
  io: Pick<ToolkitIo, 'runner'>,
): void {
  for (const prerequisite of definition.prerequisites) {
    const result = io.runner(
      { command: prerequisite.command, args: prerequisite.args },
      { cwd, interactive: false },
    );
    if (result.status !== 0) {
      throw new Error(
        `Missing prerequisite "${prerequisite.command}" for ${definition.name}. ${prerequisite.hint} See ${definition.docsUrl}`,
      );
    }
  }
}
