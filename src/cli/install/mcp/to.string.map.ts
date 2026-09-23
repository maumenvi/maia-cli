




/** Performs the to string map operation. */
export function toStringMap(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') {
    return {};
  }
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
  );
}
