import type { CatalogDependencyBase } from './catalog.dependency.base.ts';

/** Describes the skill dependency contract. */
export interface SkillDependency extends CatalogDependencyBase {
  /** Name of the skill at its source when it is installed under another local name (`--as`). */
  sourceName?: string;
}
