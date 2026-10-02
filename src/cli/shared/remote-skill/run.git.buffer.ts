import { execFileSync } from 'node:child_process';

/** Executes Git without a shell and returns raw stdout, so binary files survive. */
export function runGitBuffer(args: string[], cwd?: string): Buffer {
  return execFileSync('git', ['-c', 'protocol.ext.allow=never', ...args], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
    maxBuffer: 16 * 1024 * 1024,
  });
}
