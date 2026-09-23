import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { SourceLock } from '../../types/lock/source.lock.ts';
import type { CatalogStorePaths } from '../../types/store/catalog.store.paths.ts';
import type { VscodeMcpServerConfig } from './vscode.mcp.server.config.ts';

/** Performs the sync vs code mcp config operation. */
export function syncVsCodeMcpConfig(paths: CatalogStorePaths, lock: SourceLock): { file: string; servers: Record<string, VscodeMcpServerConfig> } {
  const servers = Object.values(lock.packages)
    .filter((pkg) => pkg.type === 'mcp' && pkg.enabled)
    .reduce<Record<string, VscodeMcpServerConfig>>((acc, pkg) => {
      if (!pkg.vscode) {
        throw new Error(`MCP "${pkg.name}" is missing VS Code MCP config in lock`);
      }
      if (pkg.vscode.transport === 'http' && !pkg.vscode.url) {
        throw new Error(`MCP "${pkg.name}" is missing VS Code MCP URL for HTTP transport`);
      }
      if (pkg.vscode.transport === 'sse' && !pkg.vscode.url) {
        throw new Error(`MCP "${pkg.name}" is missing VS Code MCP URL for SSE transport`);
      }
      if (pkg.vscode.transport === 'ws' && !pkg.vscode.url) {
        throw new Error(`MCP "${pkg.name}" is missing VS Code MCP URL for WebSocket transport`);
      }
      if (pkg.vscode.transport === 'npx' && !pkg.vscode.package) {
        throw new Error(`MCP "${pkg.name}" is missing VS Code MCP package for npx transport`);
      }
      if ((pkg.vscode.transport === 'stdio' || typeof pkg.vscode.transport === 'undefined') && !pkg.vscode.command) {
        throw new Error(`MCP "${pkg.name}" is missing VS Code MCP command for stdio transport`);
      }
      acc[pkg.name] =
        pkg.vscode.transport === 'http' || pkg.vscode.transport === 'sse' || pkg.vscode.transport === 'ws'
          ? {
              type: pkg.vscode.transport,
              url: pkg.vscode.url,
              ...(pkg.vscode.headers && Object.keys(pkg.vscode.headers).length > 0 ? { headers: pkg.vscode.headers } : {}),
            }
          : pkg.vscode.transport === 'npx'
            ? {
                command: 'npx',
                args: [
                  ...(pkg.vscode.npxArgs ?? ['-y']),
                  pkg.vscode.package,
                  ...(pkg.vscode.args ?? []),
                ],
                ...(pkg.vscode.env && Object.keys(pkg.vscode.env).length > 0 ? { env: pkg.vscode.env } : {}),
              }
            : {
                command: pkg.vscode.command,
                ...(pkg.vscode.args && pkg.vscode.args.length > 0 ? { args: pkg.vscode.args } : {}),
                ...(pkg.vscode.env && Object.keys(pkg.vscode.env).length > 0 ? { env: pkg.vscode.env } : {}),
              };
      return acc;
    }, {});

  mkdirSync(path.dirname(paths.vscodeMcp), { recursive: true });
  writeFileSync(paths.vscodeMcp, `${JSON.stringify({ servers }, null, 2)}\n`, 'utf8');
  return { file: paths.vscodeMcp, servers };
}
