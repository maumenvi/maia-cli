




/** Performs the parse skill name from path operation. */
export function parseSkillNameFromPath(value: string): string | null {
  const parts = value.split('/').filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const fileName = parts.at(-1)?.toLowerCase();
  if (fileName !== 'skill.md') {
    return null;
  }

  const candidate = parts.at(-2) ?? '';
  return /^[A-Za-z0-9._-]+$/.test(candidate) ? candidate : null;
}
