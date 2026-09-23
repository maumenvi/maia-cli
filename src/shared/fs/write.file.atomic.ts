import { closeSync, openSync, renameSync, rmSync, writeSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

/**
 * Writes content to a file atomically: the file at `targetPath` either
 * keeps its previous content or is fully replaced by `content` — a crash or
 * write failure mid-operation never leaves a truncated or partial file.
 *
 * Implemented as write-to-temp-file-in-same-directory + rename, since rename
 * is atomic on the same filesystem. On failure, the temp file is removed and
 * the original `fs` error is re-thrown unchanged (its `code` preserved).
 */
export function writeFileAtomic(targetPath: string, content: string): void {
  const dir = path.dirname(targetPath);
  const tempPath = path.resolve(dir, `.${path.basename(targetPath)}.${randomBytes(6).toString('hex')}.tmp`);

  let fd: number | undefined;
  try {
    fd = openSync(tempPath, 'w');
    writeSync(fd, content, null, 'utf8');
    closeSync(fd);
    fd = undefined;
    renameSync(tempPath, targetPath);
  } catch (error) {
    if (fd !== undefined) {
      closeSync(fd);
    }
    rmSync(tempPath, { force: true });
    throw error;
  }
}
