/** Keeps the first hint for each credential name. */
export function dedupeCredentialHints<T extends { name: string }>(hints: T[]): T[] {
  return hints.filter((hint, index, all) => all.findIndex((other) => other.name === hint.name) === index);
}
