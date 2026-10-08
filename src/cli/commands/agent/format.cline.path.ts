import os from 'node:os';
import path from 'node:path';

/** Formats a settings path with a home-directory abbreviation when possible. */
export function formatClinePath(settingsPath: string): string {
  const home = os.homedir();
  return settingsPath.startsWith(`${home}${path.sep}`)
    ? `~/${path.relative(home, settingsPath)}`
    : settingsPath;
}
