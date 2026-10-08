import { readFileSync } from 'node:fs';

/** Reads valid Cline JSON settings or returns its parse error for pending status reporting. */
export function readClineSettings(
  settingsPath: string,
): { data: Record<string, unknown>; error?: never } | { data?: never; error: Error } {
  const contents = readFileSync(settingsPath, 'utf8');
  try {
    const value: unknown = JSON.parse(contents);
    const isRecord = (input: unknown): input is Record<string, unknown> =>
      typeof input === 'object' && input !== null && !Array.isArray(input);
    if (!isRecord(value)) return { error: new SyntaxError('settings root must be a JSON object') };
    return { data: value };
  } catch (error) {
    if (error instanceof SyntaxError) return { error };
    throw error;
  }
}
