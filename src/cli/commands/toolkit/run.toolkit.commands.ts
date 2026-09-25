import type { ToolkitCommand } from '../../../agent/toolkits/contracts/toolkit.command.ts';
import type { ToolkitIo } from './toolkit.io.ts';

/** Runs commands in order and returns the first failure, if any. */
export function runToolkitCommands(
  commands: ToolkitCommand[],
  cwd: string,
  interactive: boolean,
  io: Pick<ToolkitIo, 'runner'>,
): { failed?: { command: ToolkitCommand; status: number; stderr: string }; completed: ToolkitCommand[] } {
  const completed: ToolkitCommand[] = [];
  for (const command of commands) {
    const result = io.runner(command, { cwd, interactive });
    if (result.status !== 0) {
      return { failed: { command, status: result.status, stderr: result.stderr }, completed };
    }
    completed.push(command);
  }
  return { completed };
}
