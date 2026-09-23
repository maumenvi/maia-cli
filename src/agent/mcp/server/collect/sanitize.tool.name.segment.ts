/** Replaces every character agents do not accept in a tool-name identifier. */
export function sanitizeToolNameSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '');
}
