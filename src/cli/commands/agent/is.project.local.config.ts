import path from 'node:path';

/** Performs the is project local config operation. */
export function isProjectLocalConfig(configPath: string, cwd: string): boolean {
  const resolvedCwd = path.resolve(cwd);
  const resolvedConfig = path.resolve(configPath);
  return resolvedConfig === resolvedCwd || resolvedConfig.startsWith(`${resolvedCwd}${path.sep}`);
}
