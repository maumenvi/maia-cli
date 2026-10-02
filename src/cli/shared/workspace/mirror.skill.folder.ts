import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';

import { readSkillDirectory } from '../../../agent/catalog/lock/read.skill.directory.ts';
import { assertMaterializedPath } from './assert.materialized.path.ts';
import { writeMaterializedFile } from './write.materialized.file.ts';

/**
 * Makes `targetDir` hold exactly `files`: writes each one through the
 * workspace guards and deletes files left over from an older version, never
 * touching anything outside `targetDir`.
 */
export function mirrorSkillFolder(
  workspaceRoot: string,
  targetDir: string,
  files: ReadonlyArray<{ path: string; content: Buffer }>,
  label: string,
): void {
  const wanted = new Set(files.map((file) => file.path));
  if (existsSync(targetDir)) {
    for (const existing of readSkillDirectory(targetDir)) {
      if (!wanted.has(existing.path)) {
        rmSync(path.join(targetDir, existing.path), { force: true });
      }
    }
  }
  const toRelative = (absolute: string) => path.relative(workspaceRoot, absolute).split(path.sep).join('/');
  for (const file of files) {
    const targetPath = path.join(targetDir, file.path);
    assertMaterializedPath(workspaceRoot, toRelative(targetPath), label, toRelative(targetDir));
    writeMaterializedFile(workspaceRoot, targetPath, label, file.content);
  }
}
