import { spawnSync } from 'node:child_process';

import type { NativeRunner } from './native.runner.ts';

/** Status reported when the command's executable cannot be found. */
const COMMAND_NOT_FOUND = 127;

/** Runs a native command from argv, never through a shell (research D9). */
export const runNativeCommand: NativeRunner = ({ command, args }, { cwd, interactive }) => {
  const result = spawnSync(command, args, {
    cwd,
    shell: false,
    stdio: interactive ? 'inherit' : 'pipe',
    encoding: 'utf8',
  });
  if (result.error) {
    return { status: COMMAND_NOT_FOUND, stdout: '', stderr: result.error.message };
  }
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
};
