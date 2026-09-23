import path from 'node:path';

/** Performs the resolve context paths operation. */
export function resolveContextPaths(projectRoot: string, stateDir: string) {
  const contextDir = stateDir;
  return {
    contextDir,
    contextDev: path.resolve(contextDir, 'context.dev.json'),
    contextLlm: path.resolve(contextDir, 'context.llm.json'),
    vscodeMcp: path.resolve(projectRoot, '.vscode', 'mcp.json'),
  };
}
