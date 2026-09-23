import { sanitizeToolNameSegment } from './sanitize.tool.name.segment.ts';

/**
 * Builds the tool name a proxied MCP tool is exposed under.
 *
 * Registry ids carry dots and slashes (`io.github.upstash/context7`), which are
 * outside the identifier charset agents accept for a tool name. A name like
 * `io.github.upstash/context7__query-docs` gets rejected during validation, and
 * the refusal surfaces to the user as the agent distrusting the tool rather
 * than as a malformed name.
 *
 * Only the last segment of the server id is kept — the namespace prefix carries
 * no meaning for the caller — and any remaining character outside the charset
 * becomes an underscore. The `__` separator is preserved so the router can
 * still split the name back into server and tool.
 */
export function toProxiedToolName(serverName: string, toolName: string): string {
  const lastSegment = serverName.split('/').pop() ?? serverName;
  const server = sanitizeToolNameSegment(lastSegment) || 'mcp';
  const tool = sanitizeToolNameSegment(toolName) || 'tool';
  return `${server}__${tool}`;
}

