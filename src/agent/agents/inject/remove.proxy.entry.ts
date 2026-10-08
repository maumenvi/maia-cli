import type { LegacyProxyLocation } from '../contracts/legacy.proxy.location.ts';

/** Removes one Maia proxy entry from a JSON agent config without changing other entries. */
export function removeProxyEntry(
  data: Record<string, unknown>,
  format: Exclude<LegacyProxyLocation['format'], 'toml-mcp-servers'>,
  key = 'maia',
): Record<string, unknown> {
  const topKey = format === 'mcp-servers' ? 'mcpServers' : format === 'servers' ? 'servers' : 'context_servers';
  const entries = data[topKey];
  if (!entries || typeof entries !== 'object' || Array.isArray(entries) || !(key in entries)) return data;
  const { [key]: _removed, ...remaining } = entries as Record<string, unknown>;
  return { ...data, [topKey]: remaining };
}
