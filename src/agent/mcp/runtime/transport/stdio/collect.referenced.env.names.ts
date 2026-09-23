/**
 * Collects the environment variable names a config value references.
 *
 * Covers both placeholder syntaxes `resolveEnvPlaceholders` accepts — the
 * explicit `${env:NAME}` and the bare `{NAME}` — so a value using either form
 * is validated before the process starts. Names are returned in the order they
 * appear, without duplicates.
 */
export function collectReferencedEnvNames(value: string): string[] {
  const names: string[] = [];
  const patterns = [/\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g, /\{([A-Za-z_][A-Za-z0-9_]*)\}/g];

  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) {
      const name = match[1];
      if (typeof name === 'string' && !names.includes(name)) {
        names.push(name);
      }
    }
  }

  return names;
}
