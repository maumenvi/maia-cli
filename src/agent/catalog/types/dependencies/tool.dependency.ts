import type { CatalogDependencyBase } from './catalog.dependency.base.ts';

/** Describes the tool dependency contract. */
export interface ToolDependency extends CatalogDependencyBase {
  inputSchema?: Record<string, unknown>;
}
