import path from 'node:path';

/**
 * Maia's per-user config directory. Never `~/.maia`: any folder holding
 * `.maia` is treated as a project root, which would turn the home folder
 * into a "project" for every command run outside one.
 */
export function resolveGlobalConfigDir(env: Record<string, string | undefined>, platform: NodeJS.Platform, home: string): string {
  if (env.MAIA_CONFIG_HOME) {
    return env.MAIA_CONFIG_HOME;
  }
  if (platform === 'win32') {
    return path.join(env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'maia');
  }
  return path.join(env.XDG_CONFIG_HOME || path.join(home, '.config'), 'maia');
}
