/** The skill folder each fake GitHub repository used by the tests publishes. */
const SKILLS_BY_REPOSITORY: Record<string, string> = {
  'vercel-labs/skills': 'skills/find-skills/SKILL.md',
  'martinholovsky/claude-skills-generator': 'skills/sqlite-database-expert/SKILL.md',
  'rightnow-ai/openfang': 'skills/sqlite-expert/SKILL.md',
};

/** Answers a GitHub recursive-tree request for the fake repositories above, or null. */
export function fakeSkillTree(url: string): Response | null {
  const match = url.match(/^https:\/\/api\.github\.com\/repos\/([^/]+\/[^/]+)\/git\/trees\//);
  const skillPath = match ? SKILLS_BY_REPOSITORY[match[1]] : undefined;
  return skillPath ? Response.json({ tree: [{ type: 'blob', mode: '100644', path: skillPath }] }) : null;
}
