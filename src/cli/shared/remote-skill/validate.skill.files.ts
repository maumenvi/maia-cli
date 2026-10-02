import { SKILL_SIZE_LIMITS } from './skill.size.limits.ts';
import type { SkillFiles } from './skill.files.ts';

/**
 * Checks one fetched skill folder before anything is written: every path stays
 * inside the folder, SKILL.md is present, and the size limits hold. Returns the
 * files sorted by path.
 */
export function validateSkillFiles(name: string, files: SkillFiles, sourceUrl: string): SkillFiles {
  for (const file of files) {
    const unsafe = !file.path
      || file.path.startsWith('/')
      || file.path.includes('\\')
      || /^[A-Za-z]:/.test(file.path)
      || file.path.split('/').some((segment) => segment === '..' || segment === '');
    if (unsafe) {
      throw new Error(`Skill "${name}" contains an unsafe path: ${file.path}`);
    }
  }
  if (!files.some((file) => file.path === 'SKILL.md')) {
    throw new Error(`Skill "${name}" was not found in ${sourceUrl}`);
  }
  const bytes = files.reduce((total, file) => total + file.content.length, 0);
  if (files.length > SKILL_SIZE_LIMITS.maxFiles || bytes > SKILL_SIZE_LIMITS.maxBytes) {
    const megabytes = (bytes / (1024 * 1024)).toFixed(1);
    throw new Error(`Skill "${name}" exceeds the size limit (${files.length} files, ${megabytes} MB)`);
  }
  return [...files].sort((a, b) => a.path.localeCompare(b.path));
}
