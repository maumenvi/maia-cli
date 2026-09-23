import { AGENT_GUIDANCE_MARKER } from './agent.guidance.marker.ts';

/** Defines the agent guidance text value. */
export const AGENT_GUIDANCE_TEXT = `
${AGENT_GUIDANCE_MARKER}
## Maia capability discovery

Use the Maia CLI as the authoritative source of truth for skills, tools, and MCP servers.

Before assuming a capability exists, query it with:

\`\`\`bash
 maia list-capabilities --json
 maia list-tools --json
 maia list-skills --json
\`\`\`

The project may register capabilities in the manifest while the active agent runtime only exposes a subset. Always prefer the CLI inventory for discovery.

The built-in MCP server should also expose these discovery tools with clear descriptions so downstream agents can call them automatically without repeated prompting.

When agents are configured, Maia also registers each installed skill and MCP server natively in that agent's standard locations (for example \`.claude/skills/\`, \`.mcp.json\`, \`.github/copilot-instructions.md\`) alongside the aggregating \`maia\` proxy, so capabilities are picked up without extra prompting.
`;
