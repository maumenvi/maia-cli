import type { ToolkitCommand } from '../../../agent/toolkits/contracts/toolkit.command.ts';
import type { NativeRunResult } from './native.run.result.ts';

/**
 * Runs a toolkit's native command. `interactive` streams output to the user
 * (install/remove); otherwise output is captured (version and prerequisite checks).
 */
export type NativeRunner = (
  command: ToolkitCommand,
  options: { cwd: string; interactive: boolean },
) => NativeRunResult;
