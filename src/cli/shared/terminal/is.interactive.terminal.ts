/**
 * The CLI's single definition of "interactive": both stdin and stdout are
 * terminals. Anything else (pipes, CI, agents) must never be prompted.
 */
export function isInteractiveTerminal(
  stdin: { isTTY?: boolean } = process.stdin,
  stdout: { isTTY?: boolean } = process.stdout,
): boolean {
  return Boolean(stdin.isTTY && stdout.isTTY);
}
