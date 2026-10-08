/** Removes one Maia-managed marked block while retaining surrounding content. */
export function removeMarkedBlock(current: string, startMarker: string, endMarker: string): string {
  const startIndex = current.indexOf(startMarker);
  const endIndex = current.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return current;

  const before = current.slice(0, startIndex).trimEnd();
  const after = current.slice(endIndex + endMarker.length).trim();
  if (before && after) return `${before}\n\n${after}\n`;
  if (before) return `${before}\n`;
  if (after) return `${after}\n`;
  return '';
}
