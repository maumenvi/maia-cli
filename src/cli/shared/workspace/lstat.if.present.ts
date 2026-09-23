import { lstatSync } from 'node:fs';

/** Performs the lstat if present operation. */
export function lstatIfPresent(candidate: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(candidate);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}
