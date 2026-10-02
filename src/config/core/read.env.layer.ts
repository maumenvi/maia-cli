import { existsSync, readFileSync } from 'node:fs';

/**
 * Reads one `KEY=value` file into a map (quotes stripped). A missing file is
 * an empty layer; any other read error is returned for the caller to report.
 */
export function readEnvLayer(filePath: string): { values: Map<string, string>; error?: NodeJS.ErrnoException } {
  const values = new Map<string, string>();
  if (!existsSync(filePath)) {
    return { values };
  }
  let content: string;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (error) {
    return { values, error: error as NodeJS.ErrnoException };
  }
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    const separator = line.indexOf('=');
    if (!line || line.startsWith('#') || separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    if (key) values.set(key, line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, ''));
  }
  return { values };
}
