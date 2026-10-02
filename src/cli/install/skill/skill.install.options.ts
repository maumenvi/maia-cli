








/** Describes the skill install options contract. */
export interface SkillInstallOptions {
  name: string;
  source: string;
  version: string;
  allowedLlms: string[];
  /** Name of the skill at its source, when installed under another local name (`--as`). */
  sourceName?: string;
}
