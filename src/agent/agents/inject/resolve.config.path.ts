import { existsSync } from 'node:fs';

import type { AgentTarget } from '../contracts/agent.target.ts';

/** Return the first existing candidate path, or the first candidate if none exist. */
export function resolveConfigPath(target: AgentTarget, cwd: string): string {
  const candidates = target.configPaths(cwd);
  return candidates.find(existsSync) ?? candidates[0];
}
