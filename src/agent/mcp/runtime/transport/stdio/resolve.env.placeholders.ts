














/** Performs the resolve env placeholders operation. */
export function resolveEnvPlaceholders(value: string): string {
  return value
    .replace(/\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key: string) => {
      const resolved = process.env[key] ?? process.env[key.toUpperCase()] ?? process.env[key.toLowerCase()];
      return typeof resolved === 'string' ? resolved : '';
    })
    .replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key: string) => {
      const resolved = process.env[key] ?? process.env[key.toUpperCase()] ?? process.env[key.toLowerCase()];
      return typeof resolved === 'string' ? resolved : '';
    });
}
