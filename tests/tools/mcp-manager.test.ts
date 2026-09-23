import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { AgentCatalogStore } from '../../src/agent/catalog/store/agent-catalog-store.ts';
import { AgentMcpManager } from '../../src/agent/mcp/manager/manager/agent-mcp-manager.ts';

describe('AgentMcpManager', () => {
  let manager: AgentMcpManager;
  let tempDir: string;
  let fixturePath: string;
  let flakyFixturePath: string;
  let envFixturePath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'maia-mcp-manager-'));
    fixturePath = fileURLToPath(new URL('../fixtures/mcp/mock-stdio-server.mjs', import.meta.url));
    flakyFixturePath = fileURLToPath(new URL('../fixtures/mcp/mock-flaky-call-server.mjs', import.meta.url));
    envFixturePath = fileURLToPath(new URL('../fixtures/mcp/mock-env-server.mjs', import.meta.url));
    const catalog = new AgentCatalogStore({ cwd: tempDir });
    manager = new AgentMcpManager(catalog);
  });

  afterEach(async () => {
    await manager.shutdownAll();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('creates empty manager', () => {
      assert.ok(manager instanceof AgentMcpManager);
    });

    it('has add method', () => {
      assert.ok(typeof manager.add === 'function');
    });

    it('has list method', () => {
      assert.ok(typeof manager.list === 'function');
    });

    it('has discover method', () => {
      assert.ok(typeof manager.discover === 'function');
    });
  });

  describe('MCP server management', () => {
    it('lists empty tools initially', () => {
      const tools = manager.list();
      assert.ok(Array.isArray(tools));
    });
  });

  describe('tool discovery', () => {
    it('discover returns array', async () => {
      const tools = await manager.discover('default');
      assert.ok(Array.isArray(tools));
    });

    it('discover supports different repositories', async () => {
      // Verify method can be called with different repo names
      const repos = ['default', 'custom', 'github'];
      for (const repo of repos) {
        const result = manager.discover(repo);
        assert.ok(result instanceof Promise);
      }
    });
  });

  describe('lifecycle management', () => {
    it('starts MCP server, lists tools and calls tool', async () => {
      await manager.installWithVscode('mock', {
        version: '*',
        source: 'local',
        enabled: true,
        vscode: {
          command: 'node',
          args: [fixturePath],
          env: {},
        },
      });

      const tools = await manager.listTools('mock');
      assert.equal(tools.length, 1);
      assert.equal(tools[0].name, 'echo');

      const result = await manager.callTool('mock', 'echo', { text: 'hello' });
      assert.equal(result.content?.[0]?.text, 'hello');
      assert.equal(existsSync(path.resolve(tempDir, '.maia', 'mcp.env')), false);

      await manager.stopServer('mock');
      assert.equal(manager.describe().sessions.length, 0);
    });

    it('passes only explicitly declared credentials to stdio MCP processes', async () => {
      const declaredSourceName = 'MAIA_TEST_DECLARED_SOURCE';
      const undeclaredSecretName = 'MAIA_TEST_UNDECLARED_SECRET';
      const childDeclaredName = 'MCP_DECLARED_VALUE';
      const previousDeclared = process.env[declaredSourceName];
      const previousUndeclared = process.env[undeclaredSecretName];
      process.env[declaredSourceName] = 'allowed-value';
      process.env[undeclaredSecretName] = 'must-not-leak';

      try {
        await manager.installWithVscode('mock-env', {
          version: '*',
          source: 'local',
          enabled: true,
          vscode: {
            command: 'node',
            args: [envFixturePath],
            env: {
              [childDeclaredName]: `\${env:${declaredSourceName}}`,
            },
          },
        });

        const result = await manager.callTool('mock-env', 'read-env', {
          names: [childDeclaredName, declaredSourceName, undeclaredSecretName],
        });
        const values = JSON.parse(result.content?.[0]?.text ?? '{}') as Record<string, string | null>;
        assert.equal(values[childDeclaredName], 'allowed-value');
        assert.equal(values[declaredSourceName], null);
        assert.equal(values[undeclaredSecretName], null);
      } finally {
        if (typeof previousDeclared === 'undefined') delete process.env[declaredSourceName];
        else process.env[declaredSourceName] = previousDeclared;
        if (typeof previousUndeclared === 'undefined') delete process.env[undeclaredSecretName];
        else process.env[undeclaredSecretName] = previousUndeclared;
      }
    });

    it('passes no parent secret to an MCP that declares no environment', async () => {
      const undeclaredSecretName = 'MAIA_TEST_NO_DECLARATION_SECRET';
      const previous = process.env[undeclaredSecretName];
      process.env[undeclaredSecretName] = 'must-not-leak';

      try {
        await manager.installWithVscode('mock-env-bare', {
          version: '*',
          source: 'local',
          enabled: true,
          vscode: { command: 'node', args: [envFixturePath], env: {} },
        });

        const result = await manager.callTool('mock-env-bare', 'read-env', {
          names: [undeclaredSecretName],
        });
        const values = JSON.parse(result.content?.[0]?.text ?? '{}') as Record<string, string | null>;
        assert.equal(values[undeclaredSecretName], null);
      } finally {
        if (typeof previous === 'undefined') delete process.env[undeclaredSecretName];
        else process.env[undeclaredSecretName] = previous;
      }
    });

    it('retries transient callTool failures with backoff', async () => {
      await manager.installWithVscode('mock-flaky', {
        version: '*',
        source: 'local',
        enabled: true,
        vscode: {
          command: 'node',
          args: [flakyFixturePath],
          env: {},
        },
      });

      const result = await manager.callTool('mock-flaky', 'echo', {}, { retries: 1 });
      assert.equal(result.content?.[0]?.text, 'recovered');
    });

    it('opens circuit after repeated failures', async () => {
      await manager.installWithVscode('broken', {
        version: '*',
        source: 'local',
        enabled: true,
        vscode: {
          command: '__missing_mcp_command__',
          args: [],
          env: {},
        },
      });

      manager = new AgentMcpManager(new AgentCatalogStore({ cwd: tempDir }), {
        maxRetries: 0,
        circuitFailureThreshold: 1,
        circuitOpenMs: 60_000,
      });

      await assert.rejects(() => manager.startServer('broken'), /spawn __missing_mcp_command__/i);
      await assert.rejects(() => manager.startServer('broken'), /circuit is open/i);
    });

    it('runs healthcheck for active session', async () => {
      await manager.installWithVscode('mock', {
        version: '*',
        source: 'local',
        enabled: true,
        vscode: {
          command: 'node',
          args: [fixturePath],
          env: {},
        },
      });

      await manager.startServer('mock');
      const health = await manager.healthcheck('mock');
      assert.equal(health.ok, true);
      assert.equal(health.status, 'running');
    });

    it('supports HTTP transport', async () => {
      const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const body = await readJsonBody(req);
        const payload = body as {
          jsonrpc?: string;
          id?: number;
          method: string;
          params?: { arguments?: { text?: unknown } };
        };
        if (!payload || payload.jsonrpc === undefined) {
          res.statusCode = 400;
          res.end();
          return;
        }
        if (payload.method === 'notifications/initialized' || payload.method === 'exit') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (payload.method === 'initialize') {
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: payload.id,
            result: { protocolVersion: '2024-11-05', serverInfo: { name: 'mock-http', version: '1.0.0' } },
          }));
          return;
        }
        if (payload.method === 'tools/list') {
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: payload.id,
            result: { tools: [{ name: 'echo', inputSchema: { type: 'object' } }] },
          }));
          return;
        }
        if (payload.method === 'tools/call') {
          const text = String(payload.params?.arguments?.text ?? '');
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: payload.id,
            result: { content: [{ type: 'text', text }] },
          }));
          return;
        }
        if (payload.method === 'shutdown') {
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ jsonrpc: '2.0', id: payload.id, result: {} }));
          return;
        }
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: payload.id,
          error: { code: -32601, message: `Method not found: ${payload.method}` },
        }));
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      const port = address.port;

      try {
        await manager.installWithVscode('mock-http', {
          version: '*',
          source: 'local',
          enabled: true,
          vscode: {
            transport: 'http',
            url: `http://127.0.0.1:${port}/mcp`,
            headers: {},
          },
        });

        const tools = await manager.listTools('mock-http');
        assert.equal(tools[0]?.name, 'echo');
        const result = await manager.callTool('mock-http', 'echo', { text: 'via-http' });
        assert.equal(result.content?.[0]?.text, 'via-http');
      } finally {
        await manager.stopServer('mock-http');
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('supports SSE transport', async () => {
      const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const body = await readJsonBody(req);
        const payload = body as {
          jsonrpc?: string;
          id?: number;
          method: string;
          params?: { arguments?: { text?: unknown } };
        };
        if (!payload || payload.jsonrpc === undefined) {
          res.statusCode = 400;
          res.end();
          return;
        }
        if (payload.method === 'notifications/initialized' || payload.method === 'exit') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (payload.method === 'initialize') {
          res.setHeader('content-type', 'text/event-stream');
          res.end(toSseData({
            jsonrpc: '2.0',
            id: payload.id,
            result: { protocolVersion: '2024-11-05', serverInfo: { name: 'mock-sse', version: '1.0.0' } },
          }));
          return;
        }
        if (payload.method === 'tools/list') {
          res.setHeader('content-type', 'text/event-stream');
          res.end(toSseData({
            jsonrpc: '2.0',
            id: payload.id,
            result: { tools: [{ name: 'echo', inputSchema: { type: 'object' } }] },
          }));
          return;
        }
        if (payload.method === 'tools/call') {
          const text = String(payload.params?.arguments?.text ?? '');
          res.setHeader('content-type', 'text/event-stream');
          res.end(toSseData({
            jsonrpc: '2.0',
            id: payload.id,
            result: { content: [{ type: 'text', text }] },
          }));
          return;
        }
        if (payload.method === 'shutdown') {
          res.setHeader('content-type', 'text/event-stream');
          res.end(toSseData({ jsonrpc: '2.0', id: payload.id, result: {} }));
          return;
        }
        res.setHeader('content-type', 'text/event-stream');
        res.end(toSseData({
          jsonrpc: '2.0',
          id: payload.id,
          error: { code: -32601, message: `Method not found: ${payload.method}` },
        }));
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      const port = address.port;

      try {
        await manager.installWithVscode('mock-sse', {
          version: '*',
          source: 'local',
          enabled: true,
          vscode: {
            transport: 'sse',
            url: `http://127.0.0.1:${port}/mcp`,
            headers: {},
          },
        });

        const tools = await manager.listTools('mock-sse');
        assert.equal(tools[0]?.name, 'echo');
        const result = await manager.callTool('mock-sse', 'echo', { text: 'via-sse' });
        assert.equal(result.content?.[0]?.text, 'via-sse');
      } finally {
        await manager.stopServer('mock-sse');
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('supports NPX transport with local mocked npx', async () => {
      const fakeBinDir = path.join(tempDir, 'fake-bin');
      mkdirSync(fakeBinDir, { recursive: true });
      const fakeNpxPath = path.join(fakeBinDir, 'npx');
      const invokedPackageFile = path.join(tempDir, 'invoked-package.txt');
      writeFileSync(fakeNpxPath, createFakeNpxScript(), 'utf8');
      chmodSync(fakeNpxPath, 0o755);

      await manager.installWithVscode('mock-npx', {
        version: '*',
        source: 'local',
        enabled: true,
        vscode: {
          transport: 'npx',
          package: '@modelcontextprotocol/server-mock',
          args: [],
          npxArgs: ['-y'],
          env: {
            PATH: `${fakeBinDir}${path.delimiter}${process.env.PATH ?? ''}`,
            MAIA_MOCK_MCP_SERVER_PATH: fixturePath,
            MAIA_CAPTURE_PACKAGE_FILE: invokedPackageFile,
          },
        },
      });

      const tools = await manager.listTools('mock-npx');
      assert.equal(tools[0]?.name, 'echo');
      const result = await manager.callTool('mock-npx', 'echo', { text: 'via-npx' });
      assert.equal(result.content?.[0]?.text, 'via-npx');

      const invokedPackage = readTrimmedFile(invokedPackageFile);
      assert.equal(invokedPackage, '@modelcontextprotocol/server-mock');

      await manager.stopServer('mock-npx');
    });

    it('supports WebSocket transport with mocked global WebSocket', async () => {
      const OriginalWebSocket = (globalThis as unknown as { WebSocket?: unknown }).WebSocket;
      const wsMock = createWebSocketMockClass();
      (globalThis as unknown as { WebSocket?: unknown }).WebSocket = wsMock;

      try {
        await manager.installWithVscode('mock-ws', {
          version: '*',
          source: 'local',
          enabled: true,
          vscode: {
            transport: 'ws',
            url: 'ws://mock.local/mcp',
            headers: {},
          },
        });

        const tools = await manager.listTools('mock-ws');
        assert.equal(tools[0]?.name, 'echo');
        const result = await manager.callTool('mock-ws', 'echo', { text: 'via-ws' });
        assert.equal(result.content?.[0]?.text, 'via-ws');
        await manager.stopServer('mock-ws');
      } finally {
        (globalThis as unknown as { WebSocket?: unknown }).WebSocket = OriginalWebSocket;
      }
    });

    it('hides and blocks MCP server for unauthorized LLM', async () => {
      await manager.installWithVscode('restricted-mcp', {
        version: '*',
        source: 'local',
        enabled: true,
        allowedLlms: ['model-allowed'],
        vscode: {
          command: 'node',
          args: [fixturePath],
          env: {},
        },
      });

      const visibleForDenied = manager.list({ llmId: 'model-denied' });
      const visibleForAllowed = manager.list({ llmId: 'model-allowed' });
      assert.equal(visibleForDenied.some((entry) => entry.name === 'restricted-mcp'), false);
      assert.equal(visibleForAllowed.some((entry) => entry.name === 'restricted-mcp'), true);
      await assert.rejects(() => manager.startServer('restricted-mcp', { llmId: 'model-denied' }), /not installed|no mcp config/i);
    });
  });
});

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function createFakeNpxScript(): string {
  return `#!/usr/bin/env sh
set -eu
while [ "$#" -gt 0 ]; do
  case "$1" in
    -*) shift ;;
    *) break ;;
  esac
done
if [ "$#" -eq 0 ]; then
  echo "missing npx package argument" >&2
  exit 1
fi
if [ -n "\${MAIA_CAPTURE_PACKAGE_FILE:-}" ]; then
  printf '%s\\n' "$1" > "$MAIA_CAPTURE_PACKAGE_FILE"
fi
shift
exec node "$MAIA_MOCK_MCP_SERVER_PATH" "$@"
`;
}

function toSseData(payload: unknown): string {
  return `event: message\ndata: ${JSON.stringify(payload)}\n\n`;
}

function readTrimmedFile(filePath: string): string {
  const content = readFileSync(filePath, 'utf8');
  return content.trim();
}

function createWebSocketMockClass() {
  return class WebSocketMock {
    static readonly OPEN = 1;
    readyState = WebSocketMock.OPEN;
    private readonly listeners = new Map<string, Array<(event?: unknown) => void>>();

    constructor(_url: string) {
      queueMicrotask(() => this.emit('open'));
    }

    addEventListener(type: 'open' | 'message' | 'error' | 'close', listener: (event?: unknown) => void): void {
      const bucket = this.listeners.get(type) ?? [];
      bucket.push(listener);
      this.listeners.set(type, bucket);
    }

    send(data: string): void {
      const request = JSON.parse(data) as {
        id?: number;
        method: string;
        params?: { arguments?: { text?: unknown } };
      };
      if (request.method === 'notifications/initialized' || request.method === 'exit') {
        return;
      }
      const response = this.buildResponse(request);
      queueMicrotask(() => this.emit('message', { data: JSON.stringify(response) }));
    }

    close(): void {
      this.readyState = 3;
      queueMicrotask(() => this.emit('close'));
    }

    private buildResponse(request: { id?: number; method: string; params?: { arguments?: { text?: unknown } } }): unknown {
      if (request.method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: { protocolVersion: '2024-11-05', serverInfo: { name: 'mock-ws', version: '1.0.0' } },
        };
      }
      if (request.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: { tools: [{ name: 'echo', inputSchema: { type: 'object' } }] },
        };
      }
      if (request.method === 'tools/call') {
        const text = String(request.params?.arguments?.text ?? '');
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: { content: [{ type: 'text', text }] },
        };
      }
      if (request.method === 'shutdown') {
        return { jsonrpc: '2.0', id: request.id, result: {} };
      }
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32601, message: `Method not found: ${request.method}` },
      };
    }

    private emit(type: string, event?: unknown): void {
      const bucket = this.listeners.get(type) ?? [];
      for (const listener of bucket) {
        listener(event);
      }
    }
  };
}
