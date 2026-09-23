import { existsSync } from 'node:fs';
import path from 'node:path';

import { findProjectRoot } from './find.project.root.ts';
import { loadDotEnvFromFile } from './load.dot.env.from.file.ts';

/**
 * Loads only Maia's MCP environment without touching the project's `.env`.
 *
 * The project root is located by walking up from `startDir`, not by trusting
 * the working directory: an MCP server is frequently launched from somewhere
 * other than the project root, and resolving `.maia/mcp.env` against the wrong
 * directory silently leaves every credential placeholder empty.
 */
export function loadMcpEnvFromCurrentProject(startDir: string = process.cwd()): void {
  const projectRoot = findProjectRoot(startDir);
  if (!projectRoot) {
    return;
  }

  const mcpEnv = path.join(projectRoot, '.maia', 'mcp.env');
  if (existsSync(mcpEnv)) {
    loadDotEnvFromFile(mcpEnv);
  }
}
