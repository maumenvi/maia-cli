import type { GitHubSkillInstall } from './git.hub.skill.install.ts';
import type { McpInstall } from './mcp.install.ts';
import type { WellKnownSkillInstall } from './well.known.skill.install.ts';

/** Defines the catalog install type. */
export type CatalogInstall = GitHubSkillInstall | WellKnownSkillInstall | McpInstall;
