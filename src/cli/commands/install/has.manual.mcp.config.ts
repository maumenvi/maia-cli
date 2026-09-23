















/** Performs the has manual mcp config operation. */
export function hasManualMcpConfig(flags: Record<string, string>): boolean {
  return ['transport', 'command', 'args', 'env', 'headers', 'npxArgs', 'package', 'url']
    .some((name) => typeof flags[name] !== 'undefined');
}
