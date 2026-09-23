/**
 * Translates a deny-list glob into regular-expression source.
 *
 * Supports the forms a path deny list needs: `*` inside one segment, `**`
 * across segments, `?` for a single character, and literal text.
 */
export function toRegExpSource(pattern: string): string {
  let source = '';
  let index = 0;

  while (index < pattern.length) {
    const char = pattern[index];

    if (char === '*') {
      const isGlobstar = pattern[index + 1] === '*';
      if (isGlobstar) {
        const followedBySlash = pattern[index + 2] === '/';
        source += followedBySlash ? '(?:.*/)?' : '.*';
        index += followedBySlash ? 3 : 2;
        continue;
      }
      source += '[^/]*';
      index += 1;
      continue;
    }

    if (char === '?') {
      source += '[^/]';
      index += 1;
      continue;
    }

    source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    index += 1;
  }

  return `^${source}$`;
}
