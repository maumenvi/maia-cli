import path from 'node:path';

import type { AgentTarget } from '../../../agent/agents/contracts/agent.target.ts';
import { resolveAuthorizedPackages } from '../../../agent/agents/profiles/resolve.authorized.packages.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';

/** Opening marker of Maia's managed capability block in an agent instruction file. */
export const CAPABILITY_BLOCK_START = '<!-- maia:capabilities:start -->';
/** Closing marker of Maia's managed capability block in an agent instruction file. */
export const CAPABILITY_BLOCK_END = '<!-- maia:capabilities:end -->';

/** Renders the managed capability block listing every capability authorized for one agent. */
export function renderAgentCapabilityBlock(store: AgentCatalogStore, target: AgentTarget): string {
  const projectRoot = store.getPaths().projectRoot;
  const packages = resolveAuthorizedPackages(store, target);
  const skills = packages.filter((pkg) => pkg.type === 'skill');
  const mcps = packages.filter((pkg) => pkg.type === 'mcp');
  const tools = packages.filter((pkg) => pkg.type === 'tool');
  const nativeSkillsDir = target.skillsDir
    ? path.relative(projectRoot, target.skillsDir(projectRoot))
    : null;
  const skillLines = skills.length > 0
    ? skills.map((pkg) => {
      const location = nativeSkillsDir
        ? ` — \`${nativeSkillsDir}/${pkg.name}/SKILL.md\``
        : ' — available through the Maia MCP server';
      return `- \`${pkg.name}\`${location}`;
    })
    : ['- _none authorized_'];

  const lines = [
    CAPABILITY_BLOCK_START,
    '<!-- Managed by Maia. Do not edit between these markers. -->',
    '',
    '## Maia capabilities',
    '',
    target.skillsDir
      ? 'The skills, MCP servers, and tools below are registered natively for this agent by Maia.'
      : 'The MCP servers below are registered natively for this agent by Maia. Skills and tools are available through the Maia MCP server.',
    'Treat `maia list-capabilities --json` as the authoritative inventory.',
    '',
    '### Skills',
    ...skillLines,
    '',
    '### MCP servers',
    '- `maia` — aggregating proxy exposing every capability below',
    ...mcps.map((pkg) => `- \`${pkg.name}\``),
    '',
    '### Tools',
    ...(tools.length > 0
      ? tools.map((pkg) => `- \`${pkg.name}\``)
      : ['- _none authorized_']),
    '',
    CAPABILITY_BLOCK_END,
  ];

  return lines.join('\n');
}
