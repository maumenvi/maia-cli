import { collectAgentMcpEntries } from '../../../agent/agents/inject/collect.agent.mcp.entries.ts';
import { injectAgentConfig } from '../../../agent/agents/inject/inject.agent.config.ts';
import { migrateLegacyProxyLocations } from '../../../agent/agents/inject/migrate.legacy.proxy.locations.ts';
import { resolveConfigPath } from '../../../agent/agents/inject/resolve.config.path.ts';
import { writeAgentCapabilityProfile } from '../../../agent/agents/profiles/write.agent.capability.profile.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { CliInteraction } from '../../contracts/cli.interaction.ts';
import { DEFAULT_INTERACTION } from '../../shared/terminal/default.interaction.ts';
import { isProjectLocalConfig } from './is.project.local.config.ts';
import { materializeAgentSkills } from './materialize.agent.skills.ts';
import { offerClineGlobalRegistration } from './offer.cline.global.registration.ts';
import { resolveClineRegistration } from './resolve.cline.registration.ts';
import { resolveTargets } from './resolve.targets.ts';
import { writeAgentInstructions } from './write.agent.instructions.ts';

/** Performs the configure agents operation. */
export async function configureAgents(
  store: AgentCatalogStore,
  agentIds: string[],
  interaction: CliInteraction = DEFAULT_INTERACTION,
  offerGlobalRegistration = false,
): Promise<void> {
  const targets = resolveTargets(agentIds);
  const cwd = store.getPaths().projectRoot;

  let applied = false;
  for (const target of targets) {
    const profileFile = writeAgentCapabilityProfile(store, target);
    const configPath = resolveConfigPath(target, cwd);
    if (!isProjectLocalConfig(configPath, cwd)) {
      console.log(`Skipping ${target.name} config injection: this project is local-only and does not modify global agent configs.`);
      // Rewrite the guidance anyway, so an older block never keeps claiming
      // a registration that does not exist.
      writeAgentInstructions(store, target, { status: 'skipped', reason: 'this project is local-only' });
      continue;
    }

    let finalPath = configPath;
    let registration: import('../../../agent/agents/contracts/agent.registration.ts').AgentRegistration;
    if (target.globalRegistration) {
      const inspection = resolveClineRegistration(target, cwd);
      registration = offerGlobalRegistration
        ? await offerClineGlobalRegistration(target, cwd, interaction, inspection)
        : inspection.registration;
      if (registration.status === 'registered') {
        finalPath = registration.configPath;
        const action = inspection.registration.status === 'registered' ? 'Already registered' : 'Registered';
        console.log(`${action} the "maia" proxy for ${target.name} in ${finalPath}.`);
        applied = true;
      } else {
        console.log(`Cline: "maia" proxy not registered yet; run "maia agent add cline" to register it.`);
        if (registration.status === 'pending') console.log(registration.manualStep);
        if (inspection.candidatePaths.length === 0) {
          console.log('Cline settings file not found; open Cline once and run "maia agent add cline" again.');
        }
      }
      for (const message of migrateLegacyProxyLocations(target, cwd, finalPath)) console.log(message);
    } else {
      const entries = collectAgentMcpEntries(store, target);
      const result = injectAgentConfig(target, configPath, entries);
      finalPath = result.configPath;
      registration = { status: 'registered', configPath: finalPath };
      const action = result.created ? 'Created' : result.updated ? 'Updated' : 'No change in';
      const mcpCount = entries.length - 1;
      console.log(`${action} ${target.name} config: ${finalPath}`);
      console.log(`Registered ${mcpCount} MCP server(s) plus the "maia" proxy in ${target.name}.`);
      if (target.registrationNote) console.log(target.registrationNote);
      for (const message of migrateLegacyProxyLocations(target, cwd, finalPath)) console.log(message);
      if (target.id === 'claude' && result.created) {
        console.log('Claude Code asks you to approve project MCP servers from .mcp.json the first time; approve "maia".');
      }
      applied = true;
    }

    const copiedSkills = materializeAgentSkills(store, target);
    if (copiedSkills.length > 0) {
      console.log(`Copied ${copiedSkills.length} skill(s) into ${target.name}'s native skills directory.`);
    }

    const instructionsFile = writeAgentInstructions(store, target, registration);
    if (instructionsFile) {
      console.log(`Updated capability guidance for ${target.name}: ${instructionsFile}`);
    }

    console.log(`Authorized capabilities saved for ${target.name}: ${profileFile}`);
    if (target.id !== 'copilot') {
      console.log('Restart the agent/app to pick up the new MCP server.');
    }
  }

  if (!applied) {
    console.log('No global agent config was modified. Maia is configured for local project management only.');
  }
}
