import type { AgentRegistration } from '../../../agent/agents/contracts/agent.registration.ts';
import type { AgentTarget } from '../../../agent/agents/contracts/agent.target.ts';
import { createClineGlobalEntry } from '../../../agent/agents/global/cline.global.entry.ts';
import { clineEntryKey } from '../../../agent/agents/global/cline.entry.key.ts';

/** Creates a pending state with the literal Cline settings entry for manual setup. */
export function pendingRegistration(
  target: AgentTarget,
  projectRoot: string,
  reason: string,
): AgentRegistration {
  const entryKey = target.globalRegistration?.entryKey(projectRoot) ?? clineEntryKey(projectRoot);
  const entry = target.globalRegistration?.entry(projectRoot)
    ?? createClineGlobalEntry(projectRoot, target.id);
  const manualStep = [
    'Add this entry under "mcpServers" in cline_mcp_settings.json (Cline → MCP Servers → Configure),',
    'or run `maia agent add cline` to let Maia add it:',
    JSON.stringify({ [entryKey]: entry }),
  ].join('\n');
  return { status: 'pending', reason, manualStep };
}
