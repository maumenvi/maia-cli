/**
 * Files that belong to the skill whose SKILL.md is `skillPath`, relative to
 * its folder. A SKILL.md at the repository root is a single-file skill: the
 * rest of the repository is never pulled in. Symlinks are refused.
 */
export function skillFolderPaths(
  name: string,
  skillPath: string,
  entries: ReadonlyArray<{ path: string; symlink: boolean }>,
): { folder: string; files: string[] } {
  const folder = skillPath.includes('/') ? skillPath.slice(0, skillPath.lastIndexOf('/')) : '';
  if (!folder) {
    return { folder, files: ['SKILL.md'] };
  }
  const prefix = `${folder}/`;
  const files: string[] = [];
  for (const entry of entries) {
    if (!entry.path.startsWith(prefix)) continue;
    const relative = entry.path.slice(prefix.length);
    if (entry.symlink) {
      throw new Error(`Skill "${name}" contains an unsafe path: ${relative}`);
    }
    files.push(relative);
  }
  return { folder, files };
}
