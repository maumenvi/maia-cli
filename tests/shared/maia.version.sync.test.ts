import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { createDefaultManifest } from '../../src/agent/catalog/manifest/defaults.ts';
import { AgentCatalogStore } from '../../src/agent/catalog/store/agent.catalog.store.ts';
import { createModernRequestMeta } from '../../src/agent/mcp/runtime/protocol/json-rpc/create.modern.request.meta.ts';
import { createModernResultMeta } from '../../src/agent/mcp/runtime/protocol/json-rpc/create.modern.result.meta.ts';
import type { JsonRpcRequest } from '../../src/agent/mcp/runtime/protocol/json-rpc/json.rpc.request.ts';
import type { JsonRpcResponse } from '../../src/agent/mcp/runtime/protocol/json-rpc/json.rpc.response.ts';
import { McpStdioServer } from '../../src/agent/mcp/server/stdio.ts';
import { versionCommand } from '../../src/cli/commands/version/version.command.ts';
import { MAIA_PACKAGE_METADATA } from '../../src/shared/package.metadata.ts';
import { readMaiaPackageVersion } from '../../src/shared/package/read.maia.package.version.ts';
import { ROOT_PACKAGE_VERSION } from '../support/root.package.version.ts';

/** Captures what the version command prints. */
async function printedVersion(): Promise<string | undefined> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    output.push(args.join(' '));
  };
  try {
    await versionCommand([], { store: {} as never });
  } finally {
    console.log = originalLog;
  }
  return output[0];
}

/** Returns the serverInfo version of a stdio server created without an explicit version. */
async function stdioServerVersion(): Promise<string | undefined> {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-version-sync-'));
  try {
    const server = new McpStdioServer(new AgentCatalogStore({ cwd: tempDir }));
    const handle = Reflect.get(server as object, 'handle') as (req: JsonRpcRequest) => Promise<JsonRpcResponse | null>;
    const response = await handle.call(server, { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    return response && 'result' in response
      ? (response.result as { serverInfo?: { version?: string } }).serverInfo?.version
      : undefined;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

describe('Maia version stays in sync with package.json', () => {
  it('exposes the package.json version at every point', async () => {
    const points: Record<string, string | undefined> = {
      'readMaiaPackageVersion()': readMaiaPackageVersion(),
      'maia --version': await printedVersion(),
      'manifest sources.local.ref': createDefaultManifest().sources.local.ref,
      'MCP result _meta serverInfo.version': createModernResultMeta()['io.modelcontextprotocol/serverInfo']?.version,
      'MCP request _meta clientInfo.version': createModernRequestMeta()['io.modelcontextprotocol/clientInfo']?.version,
      'MCP stdio server initialize serverInfo.version': await stdioServerVersion(),
    };

    for (const [point, version] of Object.entries(points)) {
      assert.equal(version, ROOT_PACKAGE_VERSION, `${point} diverge do package.json`);
    }
  });

  it('keeps no hand-written version in the package metadata', () => {
    assert.ok(!('version' in MAIA_PACKAGE_METADATA));
  });
});
