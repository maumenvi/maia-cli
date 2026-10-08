/** Removes only the requested Maia server from Cline's global server map. */
export function removeClineGlobalEntry(
  data: Record<string, unknown>,
  entryKey: string,
): Record<string, unknown> {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
  if (!isRecord(data.mcpServers) || !(entryKey in data.mcpServers)) return data;
  const { [entryKey]: _removed, ...remaining } = data.mcpServers;
  return { ...data, mcpServers: remaining };
}
