/**
 * Insert or replace a block delimited by `startMarker` / `endMarker` inside
 * `current`. When the markers are absent the block is appended; when present the
 * region between them (inclusive) is replaced, keeping the file idempotent.
 */
export function upsertMarkedBlock(
  current: string,
  startMarker: string,
  endMarker: string,
  block: string,
): string {
  const startIndex = current.indexOf(startMarker);
  const endIndex = current.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    const base = current.trim();
    return base ? `${base}\n\n${block}\n` : `${block}\n`;
  }

  const before = current.slice(0, startIndex).replace(/\s+$/, '');
  const after = current.slice(endIndex + endMarker.length).replace(/^\s+/, '');
  const head = before ? `${before}\n\n` : '';
  const tail = after ? `\n\n${after}\n` : '\n';
  return `${head}${block}${tail}`;
}
