import { createHash } from 'node:crypto';

/**
 * Per-file hashes of a skill folder plus one hash over the sorted list, so a
 * missing, changed or extra file changes the artifact hash and can be named.
 */
export function hashSkillFiles(files: ReadonlyArray<{ path: string; content: Buffer }>): {
  files: Record<string, string>;
  artifactHash: string;
} {
  const sorted = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const hashes: Record<string, string> = {};
  for (const file of sorted) {
    hashes[file.path] = `sha256:${createHash('sha256').update(file.content).digest('hex')}`;
  }
  const manifest = sorted.map((file) => `${file.path}\0${hashes[file.path]}\n`).join('');
  return { files: hashes, artifactHash: `sha256:${createHash('sha256').update(manifest).digest('hex')}` };
}
