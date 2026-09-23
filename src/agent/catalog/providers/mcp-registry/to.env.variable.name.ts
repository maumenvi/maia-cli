




/** Performs the to env variable name operation. */
export function toEnvVariableName(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  if (!normalized) {
    return 'VALUE';
  }
  return /^[A-Z_]/.test(normalized) ? normalized : `MCP_${normalized}`;
}
