import { readFileSync, writeFileSync } from 'node:fs';

import { removeTomlMcpEntryText } from './remove.toml.mcp.entry.text.ts';
import { validateTomlStructure } from './validate.toml.structure.ts';

/** Removes a Codex MCP table or legacy inline entry without touching other tables. */
export function removeTomlMcpEntry(filePath: string, key: string): boolean {
  const original = readFileSync(filePath, 'utf8');
  validateTomlStructure(original, filePath);
  const result = removeTomlMcpEntryText(original, key);
  if (!result.changed) return false;
  writeFileSync(filePath, result.contents, 'utf8');
  return true;
}
