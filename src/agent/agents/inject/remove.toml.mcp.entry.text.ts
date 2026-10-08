/** Removes one Codex MCP entry from TOML content while retaining other content. */
export function removeTomlMcpEntryText(
  original: string,
  key: string,
): { contents: string; changed: boolean } {
  const lines = original.split(/\r?\n/);
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tableHeader = new RegExp(`^\\s*\\[mcp_servers\\.${escapedKey}\\]\\s*(?:#.*)?$`);
  const legacyEntry = new RegExp(`^\\s*${escapedKey}\\s*=\\s*\\{`);
  const output: string[] = [];
  let insideRemovedTable = false;
  let insideRemovedInlineEntry = false;
  let changed = false;

  for (const line of lines) {
    if (/^\s*\[/.test(line)) {
      insideRemovedTable = false;
      insideRemovedInlineEntry = false;
    }
    if (tableHeader.test(line.trim())) {
      insideRemovedTable = true;
      changed = true;
      continue;
    }
    if (insideRemovedTable) continue;

    if (insideRemovedInlineEntry) {
      if (line.includes('}')) insideRemovedInlineEntry = false;
      changed = true;
      continue;
    }
    if (legacyEntry.test(line)) {
      insideRemovedInlineEntry = line.includes('{') && !line.includes('}');
      changed = true;
      continue;
    }
    output.push(line);
  }

  if (!changed) return { contents: original, changed: false };
  const updated = output.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
  return { contents: updated ? `${updated}\n` : '', changed: true };
}
