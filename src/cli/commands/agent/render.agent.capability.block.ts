import path from 'node:path';

import type { AgentRegistration } from '../../../agent/agents/contracts/agent.registration.ts';
import type { AgentTarget } from '../../../agent/agents/contracts/agent.target.ts';
import { resolveAuthorizedPackages } from '../../../agent/agents/profiles/resolve.authorized.packages.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { findToolkit } from '../../../agent/toolkits/catalog/find.toolkit.ts';

/** Opening marker of Maia's managed capability block in an agent instruction file. */
export const CAPABILITY_BLOCK_START = '<!-- maia:capabilities:start -->';
/** Closing marker of Maia's managed capability block in an agent instruction file. */
export const CAPABILITY_BLOCK_END = '<!-- maia:capabilities:end -->';

/** Renders the managed capability block listing every capability authorized for one agent. */
export function renderAgentCapabilityBlock(
  store: AgentCatalogStore,
  target: AgentTarget,
  registration: AgentRegistration,
): string {
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
  const toolkitLines = Object.values(store.loadLock()?.toolkits ?? {}).map((toolkit) => {
    const docsUrl = findToolkit(toolkit.name, store.getToolkitCatalog())?.docsUrl;
    const docs = docsUrl ? ` — docs: ${docsUrl}` : '';
    return `- \`${toolkit.name}\` ${toolkit.version} (${toolkit.scope})${docs}; details via the \`maia_toolkits\` MCP tool`;
  });

  const lines = [
    CAPABILITY_BLOCK_START,
    '<!-- Managed by Maia. Do not edit between these markers. -->',
    '',
    '## Maia capabilities',
    '',
    // Only claim what actually happened: the agent reads this text and goes
    // looking for the tools it promises.
    ...(registration.status === 'registered'
      ? [
        `The \`maia\` MCP proxy is registered for this agent in \`${path.relative(projectRoot, registration.configPath)}\`; the capabilities below are reachable through it.`,
        ...(target.skillsDir ? ['Skills are also copied into this agent\'s native skills directory.'] : []),
      ]
      : [`No MCP server is registered for this agent: ${registration.reason}. Run \`maia init ${target.id}\` in the project to register it.`]),
    'Treat `maia list-capabilities --json` as the authoritative inventory.',
    '',
    '### Skills',
    ...skillLines,
    '',
    '### MCP servers',
    ...(registration.status === 'registered'
      ? ['- `maia` — aggregating proxy exposing every capability below', ...mcps.map((pkg) => `- \`${pkg.name}\``)]
      : ['- _not registered_']),
    '',
    '### Tools',
    ...(tools.length > 0
      ? tools.map((pkg) => `- \`${pkg.name}\``)
      : ['- _none authorized_']),
    '',
    '### Toolkits',
    ...(toolkitLines.length > 0 ? toolkitLines : ['- _none installed_']),
    '',
    CAPABILITY_BLOCK_END,
  ];

  return lines.join('\n');
}
