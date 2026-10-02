import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Reads every regular file under a skill folder (POSIX relative paths; symlinks ignored). */
export function readSkillDirectory(dir: string): Array<{ path: string; content: Buffer }> {
  const files: Array<{ path: string; content: Buffer }> = [];
  const walk = (relative: string) => {
    for (const entry of readdirSync(path.join(dir, relative))) {
      const entryRelative = relative ? `${relative}/${entry}` : entry;
      const stats = lstatSync(path.join(dir, entryRelative));
      if (stats.isDirectory()) walk(entryRelative);
      else if (stats.isFile()) files.push({ path: entryRelative, content: readFileSync(path.join(dir, entryRelative)) });
    }
  };
  walk('');
  return files;
}
