import { collectAgentMcpEntries } from '../../../agent/agents/inject/collect.agent.mcp.entries.ts';
import { injectAgentConfig } from '../../../agent/agents/inject/inject.agent.config.ts';
import { resolveConfigPath } from '../../../agent/agents/inject/resolve.config.path.ts';
import { writeAgentCapabilityProfile } from '../../../agent/agents/profiles/write.agent.capability.profile.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { isProjectLocalConfig } from './is.project.local.config.ts';
import { materializeAgentSkills } from './materialize.agent.skills.ts';
import { resolveTargets } from './resolve.targets.ts';
import { writeAgentInstructions } from './write.agent.instructions.ts';

/** Performs the configure agents operation. */
export function configureAgents(store: AgentCatalogStore, agentIds: string[]): void {
  const targets = resolveTargets(agentIds);
  const cwd = store.getPaths().projectRoot;

  let applied = false;
  for (const target of targets) {
    const profileFile = writeAgentCapabilityProfile(store, target);
    const configPath = resolveConfigPath(target, cwd);
    if (!isProjectLocalConfig(configPath, cwd)) {
      console.log(`Skipping ${target.name} config injection: this project is local-only and does not modify global agent configs.`);
      continue;
    }

    const entries = collectAgentMcpEntries(store, target);
    const { created, updated, configPath: finalPath } = injectAgentConfig(target, configPath, entries);
    const action = created ? 'Created' : updated ? 'Updated' : 'No change in';
    const mcpCount = entries.length - 1;
    console.log(`${action} ${target.name} config: ${finalPath}`);
    console.log(`Registered ${mcpCount} MCP server(s) plus the "maia" proxy in ${target.name}.`);

    const copiedSkills = materializeAgentSkills(store, target);
    if (copiedSkills.length > 0) {
      console.log(`Copied ${copiedSkills.length} skill(s) into ${target.name}'s native skills directory.`);
    }

    const instructionsFile = writeAgentInstructions(store, target);
    if (instructionsFile) {
      console.log(`Updated capability guidance for ${target.name}: ${instructionsFile}`);
    }

    console.log(`Authorized capabilities saved for ${target.name}: ${profileFile}`);
    if (target.id !== 'copilot') {
      console.log('Restart the agent/app to pick up the new MCP server.');
    }
    applied = true;
  }

  if (!applied) {
    console.log('No global agent config was modified. Maia is configured for local project management only.');
  }
}
