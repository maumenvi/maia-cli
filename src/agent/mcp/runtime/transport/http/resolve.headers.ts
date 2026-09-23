import { loadMcpEnvFromCurrentProject } from '../../../../../config/core/load.mcp.env.from.current.project.ts';
import { resolveEnvPlaceholders } from './resolve.env.placeholders.ts';

/** Performs the resolve headers operation. */
export function resolveHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  loadMcpEnvFromCurrentProject();
  return Object.fromEntries(Object.entries(headers ?? {}).map(([key, value]) => [key, resolveEnvPlaceholders(value)]));
}
