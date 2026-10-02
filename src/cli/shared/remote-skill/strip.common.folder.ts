/** Removes a single top-level folder shared by every path (`skill/SKILL.md` → `SKILL.md`). */
export function stripCommonFolder<T extends { path: string }>(files: T[]): T[] {
  const firstSegments = new Set(files.map((file) => file.path.split('/')[0]));
  const [only] = firstSegments;
  if (firstSegments.size !== 1 || files.some((file) => !file.path.includes('/')) || files.some((file) => file.path === `${only}/`)) {
    return files;
  }
  return files.map((file) => ({ ...file, path: file.path.slice(only.length + 1) }));
}
