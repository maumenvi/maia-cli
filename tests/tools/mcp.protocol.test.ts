import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { JsonRpcMcpClient } from '../../src/agent/mcp/runtime/client/json-rpc-client/json.rpc.mcp.client.ts';
import type { McpRequestOptions } from '../../src/agent/mcp/runtime/contracts/mcp.request.options.ts';
import type { McpTransport } from '../../src/agent/mcp/runtime/contracts/mcp.transport.ts';
import { McpJsonRpcError } from '../../src/agent/mcp/runtime/protocol/json-rpc/mcp.json.rpc.error.ts';

class LegacyTransport implements McpTransport {
  readonly kind = 'custom' as const;
  readonly methods: string[] = [];
  readonly notifications: string[] = [];
  private readonly initializeResult: unknown;

  constructor(initializeResult: unknown) {
    this.initializeResult = initializeResult;
  }

  async request<TResult = unknown>(method: string): Promise<TResult> {
    this.methods.push(method);
    if (method === 'server/discover') {
      throw new McpJsonRpcError(-32601, 'Method not found: server/discover');
    }
    assert.equal(method, 'initialize');
    return this.initializeResult as TResult;
  }

  async notify(method: string): Promise<void> {
    this.notifications.push(method);
  }

  async close(): Promise<void> {}

  isOpen(): boolean {
    return true;
  }
}

class ModernTransport implements McpTransport {
  readonly kind = 'http' as const;
  readonly requests: Array<{ method: string; params: unknown; options?: McpRequestOptions }> = [];
  readonly notifications: string[] = [];

  async request<TResult = unknown>(
    method: string,
    params?: unknown,
    options?: McpRequestOptions,
  ): Promise<TResult> {
    this.requests.push({ method, params, options });
    if (method === 'server/discover') {
      return {
        resultType: 'complete',
        supportedVersions: ['2026-07-28'],
        capabilities: { tools: {} },
        _meta: {
          'io.modelcontextprotocol/serverInfo': { name: 'modern', version: '2.0.0' },
        },
      } as TResult;
    }
    if (method === 'tools/list') {
      return {
        resultType: 'complete',
        tools: [{
          name: 'echo',
          inputSchema: {
            type: 'object',
            properties: {
              text: { type: 'string', 'x-mcp-header': 'Text' },
            },
          },
        }],
      } as TResult;
    }
    if (method === 'tools/call') {
      return {
        resultType: 'complete',
        content: [{ type: 'text', text: 'hello' }],
      } as TResult;
    }
    throw new Error(`Unexpected method ${method}`);
  }

  async notify(method: string): Promise<void> {
    this.notifications.push(method);
  }

  async close(): Promise<void> {}

  isOpen(): boolean {
    return true;
  }
}

describe('MCP protocol era negotiation', () => {
  it('falls back to initialize for a legacy-only server', async () => {
    const transport = new LegacyTransport({
      protocolVersion: '2024-11-05',
      serverInfo: { name: 'legacy', version: '1.0.0' },
    });
    const client = new JsonRpcMcpClient(transport);

    const result = await client.initialize();

    assert.equal(result.protocolVersion, '2024-11-05');
    assert.equal(client.getProtocolEra(), 'legacy');
    assert.deepEqual(transport.methods, ['server/discover', 'initialize']);
    assert.deepEqual(transport.notifications, ['notifications/initialized']);
  });

  it('uses stateless discovery and per-request metadata for a modern server', async () => {
    const transport = new ModernTransport();
    const client = new JsonRpcMcpClient(transport);

    const initialized = await client.initialize();
    const listed = await client.listTools();
    const called = await client.callTool('echo', { text: 'hello' });
    await client.shutdown();

    assert.equal(initialized.protocolVersion, '2026-07-28');
    assert.equal(client.getProtocolEra(), undefined);
    assert.equal(listed.tools[0]?.name, 'echo');
    assert.equal(called.content?.[0]?.text, 'hello');
    assert.deepEqual(transport.notifications, []);
    assert.deepEqual(transport.requests.map((request) => request.method), [
      'server/discover',
      'tools/list',
      'tools/call',
    ]);
    for (const request of transport.requests) {
      assert.equal(request.options?.protocolVersion, '2026-07-28');
      const meta = (request.params as { _meta?: Record<string, unknown> })._meta;
      assert.equal(meta?.['io.modelcontextprotocol/protocolVersion'], '2026-07-28');
      assert.deepEqual(meta?.['io.modelcontextprotocol/clientCapabilities'], {});
    }
    assert.equal(transport.requests[2]?.options?.headers?.['Mcp-Param-Text'], 'hello');
  });

  it('does not downgrade a recognized modern protocol error', async () => {
    const transport: McpTransport = {
      kind: 'custom',
      async request(): Promise<never> {
        throw new McpJsonRpcError(-32022, 'Unsupported protocol', {
          supported: ['2027-01-01'],
          requested: '2026-07-28',
        });
      },
      async notify(): Promise<void> {},
      async close(): Promise<void> {},
      isOpen: () => true,
    };
    const client = new JsonRpcMcpClient(transport);

    await assert.rejects(() => client.initialize(), /MCP error -32022/);
  });

  it('rejects an initialize response that omits protocolVersion', async () => {
    const transport = new LegacyTransport({ serverInfo: { name: 'invalid', version: '1.0.0' } });
    const client = new JsonRpcMcpClient(transport);

    await assert.rejects(() => client.initialize(), /omitted protocol version/);
    assert.deepEqual(transport.notifications, []);
  });
});
