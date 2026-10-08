/**
 * Locates the project `maia mcp-server` serves without any path written in
 * the project config. It checks Maia's explicit project directory first,
 * then the directory exported by Claude Code, then the process working
 * directory. Undefined means no Maia project was found.
 */
export function resolveMcpServerProjectRoot(input: {
  env: Record<string, string | undefined>;
  cwd: string;
  find: (startDir: string) => string | undefined;
}): string | undefined {
  for (const projectDir of [input.env.MAIA_PROJECT_DIR, input.env.CLAUDE_PROJECT_DIR]) {
    if (!projectDir) continue;
    const projectRoot = input.find(projectDir);
    if (projectRoot) return projectRoot;
  }
  return input.find(input.cwd);
}
