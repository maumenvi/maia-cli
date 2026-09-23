import { execFileSync } from 'node:child_process';

/** Executes Git without a shell and with the command-capable `ext` protocol disabled. */
export function runGit(args: string[], cwd?: string): string {
  return execFileSync('git', ['-c', 'protocol.ext.allow=never', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
    maxBuffer: 16 * 1024 * 1024,
  });
}

