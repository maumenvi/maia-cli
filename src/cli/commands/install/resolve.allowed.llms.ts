















/** Performs the resolve allowed llms operation. */
export function resolveAllowedLlms(flags: Record<string, string>): string[] {
  if (flags.allLlms === 'true' || flags['all-llms'] === 'true') {
    return ['*'];
  }
  const configured = flags.llms?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
  return configured.length > 0 ? configured : ['*'];
}
