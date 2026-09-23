







/** Performs the normalize agent ids operation. */
export function normalizeAgentIds(agentIds: string[]): string[] {
  const ids = agentIds
    .flatMap((item) => item.split(','))
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set(ids)];
}
