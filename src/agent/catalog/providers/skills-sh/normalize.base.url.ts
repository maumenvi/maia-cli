





/** Performs the normalize base url operation. */
export function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}
