/** Returns the directory that directly contains a candidate `SKILL.md`. */
export function skillDirectoryName(filePath: string): string {
  const segments = filePath.split('/');
  return segments.length > 1 ? segments[segments.length - 2] : '';
}

