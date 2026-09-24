import type { ParsedArgs } from './parsed.args.ts';
import { SHORT_FLAG_ALIASES } from './short.flag.aliases.ts';

const SHORT_FLAG_PATTERN = /^-[a-zA-Z]$/;

/** Performs the parse flags operation. */
export function parseFlags(args: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    // Single-letter flags are always boolean, so they never consume the next argument.
    if (SHORT_FLAG_PATTERN.test(current)) {
      const letter = current.slice(1);
      flags[SHORT_FLAG_ALIASES[letter] ?? letter] = 'true';
      continue;
    }
    if (!current.startsWith('--')) {
      positional.push(current);
      continue;
    }

    const key = current.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith('--') || SHORT_FLAG_PATTERN.test(next)) {
      flags[key] = 'true';
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { positional, flags };
}
