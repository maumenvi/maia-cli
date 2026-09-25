import type { ToolkitDefinition } from '../contracts/toolkit.definition.ts';
import type { ToolkitIntegration } from '../contracts/toolkit.integration.ts';

/**
 * Picks the toolkit integrations for the configured agents (FR-008,
 * research D3). A toolkit only combines integrations that are all
 * multi-install safe, so when any safe one exists every unsafe one is
 * skipped; otherwise only the first unsafe one is used. The first returned
 * integration is the primary one.
 */
export function resolveToolkitIntegrations(
  definition: ToolkitDefinition,
  agentIds: string[],
): { integrations: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const supported: ToolkitIntegration[] = [];
  for (const agentId of agentIds) {
    const integration = definition.integrations[agentId];
    if (!integration) {
      warnings.push(`agent "${agentId}" is not supported by ${definition.name}`);
      continue;
    }
    if (!supported.some((entry) => entry.key === integration.key)) {
      supported.push(integration);
    }
  }

  if (agentIds.length === 0) {
    warnings.push(`no agent configured; ${definition.name} installed with its default integration`);
  }

  const safe = supported.filter((integration) => integration.multiInstallSafe);
  const chosen = safe.length > 0 ? safe : supported.slice(0, 1);
  for (const integration of supported) {
    if (!chosen.includes(integration)) {
      warnings.push(`integration "${integration.key}" cannot be combined with other integrations; skipped`);
    }
  }

  return { integrations: chosen.map((integration) => integration.key), warnings };
}
