








/** Performs the normalize stored env value operation. */
export function normalizeStoredEnvValue(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, '');
}
