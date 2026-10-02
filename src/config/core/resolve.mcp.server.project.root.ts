/**
 * Locates the project `maia mcp-server` serves without any path written in
 * the agent config: first the project directory the agent exports
 * (`CLAUDE_PROJECT_DIR` in Claude Code), then upwards from where the agent
 * started the process. Undefined means no Maia project was found.
 */
export function resolveMcpServerProjectRoot(input: {
  env: Record<string, string | undefined>;
  cwd: string;
  find: (startDir: string) => string | undefined;
}): string | undefined {
  const fromAgent = input.env.CLAUDE_PROJECT_DIR ? input.find(input.env.CLAUDE_PROJECT_DIR) : undefined;
  return fromAgent ?? input.find(input.cwd);
}
