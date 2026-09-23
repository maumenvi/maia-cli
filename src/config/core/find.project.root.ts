import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Walks up from a directory to the nearest Maia project root.
 *
 * Credentials live in `<root>/.maia/mcp.env`, so resolving them from the
 * current working directory alone breaks whenever a command runs from a
 * subdirectory or from an agent that launched the server elsewhere: the file
 * is simply not found and every placeholder resolves empty. Walking up finds
 * the project the way git finds its repository.
 *
 * Returns undefined when no marker is found, so callers can tell "not in a
 * Maia project" apart from "found one".
 */
export function findProjectRoot(startDir: string): string | undefined {
  let current = path.resolve(startDir);

  while (true) {
    if (existsSync(path.join(current, 'maia.json')) || existsSync(path.join(current, '.maia'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}
