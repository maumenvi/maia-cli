import path from 'node:path';

import { findProjectRoot } from './find.project.root.ts';
import { globalMcpEnvPath } from './global.mcp.env.path.ts';
import { mergeEnvLayers } from './merge.env.layers.ts';
import { readEnvLayer } from './read.env.layer.ts';
import { resolveMcpServerProjectRoot } from './resolve.mcp.server.project.root.ts';

/**
 * Loads Maia's MCP credentials without touching the project's `.env`: the
 * project's `.maia/mcp.env`, then the per-user global file, never overriding
 * a value the process already has (precedence: process > project > global).
 *
 * The project is found the way `maia mcp-server` finds it (the agent's
 * project variable, then walking up from `startDir`), because the server is
 * often launched from somewhere other than the project root.
 */
export function loadMcpEnvFromCurrentProject(startDir: string = process.cwd()): void {
  const projectRoot = resolveMcpServerProjectRoot({ env: process.env, cwd: startDir, find: findProjectRoot });
  const project = projectRoot
    ? readEnvLayer(path.join(projectRoot, '.maia', 'mcp.env')).values
    : new Map<string, string>();

  const globalFile = globalMcpEnvPath();
  const global = readEnvLayer(globalFile);
  if (global.error) {
    console.warn(`warning: cannot read ${globalFile} (${global.error.code ?? global.error.message}); using project values only.`);
  }

  Object.assign(process.env, mergeEnvLayers(process.env, project, global.values));
}
