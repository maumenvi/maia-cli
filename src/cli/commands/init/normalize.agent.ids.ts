










/** Performs the normalize agent ids operation. */
export function normalizeAgentIds(agentIds: string[]): string[] {
  return [...new Set(
    agentIds
      .flatMap((item) => item.split(/[\s,]+/))
      .map((item) => item.trim())
      .filter(Boolean),
  )];
}
