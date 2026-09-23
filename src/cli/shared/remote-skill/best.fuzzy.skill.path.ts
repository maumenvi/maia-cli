import { scoreDirectoryMatch } from './score.directory.match.ts';
import { skillDirectoryName } from './skill.directory.name.ts';

/** Selects a single unambiguous fuzzy match from repository skill files. */
export function bestFuzzySkillPath(skillFiles: string[], requestedName: string): string | null {
  const ranked = skillFiles
    .map((filePath) => ({ filePath, score: scoreDirectoryMatch(requestedName, skillDirectoryName(filePath)) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (ranked.length === 0) {
    return null;
  }

  if (ranked.length === 1 || ranked[0].score > ranked[1].score) {
    return ranked[0].filePath;
  }

  return null;
}

