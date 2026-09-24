import type { ToolkitCommandBuilder } from './toolkit.command.builder.ts';
import type { ToolkitIntegration } from './toolkit.integration.ts';
import type { ToolkitPrerequisite } from './toolkit.prerequisite.ts';

/**
 * A built-in catalog entry. It describes how to drive a toolkit's native
 * installer — Maia never materializes a toolkit's files itself (FR-006).
 */
export interface ToolkitDefinition {
  /** Unique catalog key, `^[a-z0-9-]+$`. */
  name: string;
  title: string;
  description: string;
  docsUrl: string;
  repository: string;
  supportsGlobal: boolean;
  prerequisites: ToolkitPrerequisite[];
  /** Keyed by Maia agent id; an absent agent is not supported. */
  integrations: Partial<Record<string, ToolkitIntegration>>;
  /** Project-relative paths the toolkit always creates (last segment may use `*`). */
  projectPaths: string[];
  /** Project-relative paths created per integration key. */
  integrationPaths: Record<string, string[]>;
  commands: ToolkitCommandBuilder;
  /** Extracts the version from the global tool's `--version` output. */
  parseGlobalToolVersion(stdout: string): string | null;
  /** Project-relative file that records the initialized version. */
  projectVersionFile: string;
  /** Extracts the initialized version from `projectVersionFile`'s content. */
  parseProjectVersion(content: string): string | null;
}
