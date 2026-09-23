import { bestFuzzySkillPath } from './best.fuzzy.skill.path.ts';
import { skillDirectoryName } from './skill.directory.name.ts';

/** Selects an exact, fuzzy, or sole `SKILL.md` candidate. */
export function selectSkillPath(skillFiles: string[], requestedName: string): string | null {
  return skillFiles.find((filePath) => skillDirectoryName(filePath) === requestedName)
    ?? bestFuzzySkillPath(skillFiles, requestedName)
    ?? (skillFiles.length === 1 ? skillFiles[0] : null);
}

