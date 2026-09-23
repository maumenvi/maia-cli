import type { ParsedArgs } from './parsed.args.ts';

/** Performs the parse flags operation. */
export function parseFlags(args: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith('--')) {
      positional.push(current);
      continue;
    }

    const key = current.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = 'true';
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { positional, flags };
}
