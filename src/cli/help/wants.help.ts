/** Whether the arguments ask for help (`--help` or `-h` anywhere). */
export function wantsHelp(args: readonly string[]): boolean {
  return args.includes('--help') || args.includes('-h');
}
