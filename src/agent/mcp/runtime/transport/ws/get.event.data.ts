










/** Performs the get event data operation. */
export function getEventData(event: unknown): string | null {
  if (!event || typeof event !== 'object') return null;
  const value = (event as { data?: unknown }).data;
  if (typeof value === 'string') return value;
  return null;
}
