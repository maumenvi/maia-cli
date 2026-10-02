/**
 * Rewrites accepted spellings of `--env-g` before parsing: `-env-g` (as the
 * flag was first requested) and the long synonym `--env-global`.
 */
export function normalizeLegacyFlags(args: readonly string[]): string[] {
  return args.map((arg) => (arg === '-env-g' || arg === '--env-global' ? '--env-g' : arg));
}
