




/** Performs the clean text operation. */
export function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, '').trim() : '';
}
