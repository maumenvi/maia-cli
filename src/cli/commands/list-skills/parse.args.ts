




/** Performs the parse args operation. */
export function parseArgs(args: string[]): { json: boolean; query: string } {
  const filtered: string[] = [];
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json' || arg === '--format=json') {
      json = true;
      continue;
    }
    if (arg === '--format') {
      const next = args[index + 1];
      if (next === 'json') {
        json = true;
        index += 1;
        continue;
      }
    }
    filtered.push(arg);
  }

  return { json, query: filtered.join(' ').trim() };
}
