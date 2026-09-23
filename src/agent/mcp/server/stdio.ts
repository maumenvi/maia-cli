import { createInterface } from 'node:readline';

import type { AgentCatalogStore } from '../../catalog/store/agent.catalog.store.ts';
import { AgentMcpManager } from '../manager/manager/agent.mcp.manager.ts';
import { createModernResultMeta } from '../runtime/protocol/json-rpc/create.modern.result.meta.ts';
import { isJsonRpcInboundMessage } from '../runtime/protocol/json-rpc/is.json.rpc.inbound.message.ts';
import type { JsonRpcFailure } from '../runtime/protocol/json-rpc/json.rpc.failure.ts';
import type { JsonRpcId } from '../runtime/protocol/json-rpc/json.rpc.id.ts';
import type { JsonRpcInboundMessage } from '../runtime/protocol/json-rpc/json.rpc.inbound.message.ts';
import type { JsonRpcResponse } from '../runtime/protocol/json-rpc/json.rpc.response.ts';
import { negotiateMcpProtocolVersion } from '../runtime/protocol/json-rpc/negotiate.mcp.protocol.version.ts';
import { MCP_MODERN_PROTOCOL_VERSION } from '../runtime/protocol/json-rpc/protocol.versions.ts';
import { readModernRequestMeta } from '../runtime/protocol/json-rpc/read.modern.request.meta.ts';
import { collectAllTools } from './collect/collect.all.tools.ts';
import type { McpInitializeParams } from './contracts/mcp.initialize.params.ts';
import type { McpToolEntry } from './contracts/mcp.tool.entry.ts';
import type { McpStdioServerOptions } from './mcp.stdio.server.options.ts';
import { routeToolCall } from './router.ts';

/** Serves installed Maia tools over both modern stateless and legacy stateful MCP. */
export class McpStdioServer {
  private readonly catalog: AgentCatalogStore;
  private readonly mcpManager: AgentMcpManager;
  private readonly serverName: string;
  private readonly serverVersion: string;
  private readonly dynamicDiscovery: boolean;
  private readonly agentId?: string;
  private cachedTools: McpToolEntry[] = [];
  private closing = false;

  /** Creates a dual-era aggregate server backed by the supplied catalog. */
  constructor(catalog: AgentCatalogStore, options: McpStdioServerOptions = {}) {
    this.catalog = catalog;
    this.mcpManager = new AgentMcpManager(catalog);
    this.serverName = options.name ?? 'maia-mcp-server';
    this.serverVersion = options.version ?? '1.0.0';
    this.dynamicDiscovery = options.dynamicDiscovery ?? false;
    this.agentId = options.agentId;
  }

  /** Starts newline-delimited JSON-RPC processing on stdin/stdout. */
  async start(): Promise<void> {
    this.cachedTools = await collectAllTools(this.catalog, this.mcpManager, this.agentId);
    const rl = createInterface({ input: process.stdin, terminal: false });

    rl.on('line', async (line) => {
      if (this.closing) return;
      const trimmed = line.trim();
      if (!trimmed) return;

      let payload: unknown;
      try {
        payload = JSON.parse(trimmed);
      } catch {
        this.send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
        return;
      }

      if (!isJsonRpcInboundMessage(payload)) {
        this.send({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } });
        return;
      }

      const response = await this.handle(payload);
      if (response !== null) {
        this.send(response);
      }
    });

    rl.on('close', () => {
      this.closing = true;
      void this.shutdown().then((code) => process.exit(code));
    });
  }

  /**
   * Releases child MCP sessions and reports the exit code to use.
   *
   * The close handler cannot simply call `process.exit`: `shutdownAll` would
   * never be awaited and child processes could outlive the parent as orphans
   * still holding credentials in memory. The deadline is the other half — a
   * server that never answers shutdown must not hang Maia forever.
   */
  private async shutdown(deadlineMs = 5_000): Promise<number> {
    let timer: NodeJS.Timeout | undefined;
    const deadline = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), deadlineMs);
      timer.unref?.();
    });

    try {
      const outcome = await Promise.race([
        this.mcpManager.shutdownAll().then(() => 'done' as const),
        deadline,
      ]);
      return outcome === 'done' ? 0 : 1;
    } catch {
      return 1;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Writes one JSON-RPC response without contaminating stdout framing. */
  private send(payload: JsonRpcResponse): void {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  }

  /** Routes one request according to its modern metadata or legacy lifecycle. */
  private async handle(request: JsonRpcInboundMessage): Promise<JsonRpcResponse | null> {
    const id = 'id' in request ? request.id : null;
    const { method, params } = request;
    const modernVersion = this.readRequestedModernVersion(params);
    const modern = typeof modernVersion === 'string';

    if (modernVersion && modernVersion !== MCP_MODERN_PROTOCOL_VERSION) {
      return this.unsupportedProtocol(id, modernVersion);
    }

    try {
      if (method === 'server/discover') {
        readModernRequestMeta(params);
        return this.handleDiscover(id);
      }
      if (method === 'initialize') {
        return this.handleInitialize(id, params as McpInitializeParams);
      }
      if (method === 'notifications/initialized') {
        return null;
      }
      if (method === 'tools/list') {
        if (modern) readModernRequestMeta(params);
        return await this.handleToolsList(id, modern);
      }
      if (method === 'tools/call') {
        if (modern) readModernRequestMeta(params);
        return await this.handleToolsCall(
          id,
          params as { name: string; arguments?: Record<string, unknown> },
          modern,
        );
      }
      if (!modern && method === 'ping') {
        return { jsonrpc: '2.0', id, result: {} };
      }
      if (!modern && method === 'shutdown') {
        await this.mcpManager.shutdownAll();
        return { jsonrpc: '2.0', id, result: {} };
      }
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: modern ? -32602 : -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /** Reads a per-request modern protocol revision without accepting incomplete metadata. */
  private readRequestedModernVersion(params: unknown): string | undefined {
    if (!params || typeof params !== 'object') return undefined;
    const meta = (params as { _meta?: unknown })._meta;
    if (!meta || typeof meta !== 'object') return undefined;
    const version = (meta as Record<string, unknown>)['io.modelcontextprotocol/protocolVersion'];
    return typeof version === 'string' ? version : undefined;
  }

  /** Returns the protocol-defined modern unsupported-version error. */
  private unsupportedProtocol(id: JsonRpcId, requested: string): JsonRpcFailure {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32022,
        message: `Unsupported MCP protocol version ${requested}`,
        data: {
          supported: [MCP_MODERN_PROTOCOL_VERSION],
          requested,
        },
      },
    };
  }

  /** Advertises the modern stateless era, tool capability, and server identity. */
  private handleDiscover(id: JsonRpcId): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        resultType: 'complete',
        supportedVersions: [MCP_MODERN_PROTOCOL_VERSION],
        capabilities: { tools: {} },
        instructions: 'Discovers and invokes tools installed in the current Maia workspace.',
        ttlMs: 60_000,
        cacheScope: 'private',
        _meta: createModernResultMeta(this.serverName, this.serverVersion),
      },
    };
  }

  /**
   * Negotiates a supported stateful protocol revision.
   *
   * A revision this server does not implement is rejected with -32602 rather
   * than silently answered with a different one (FR-004). -32602 is the
   * JSON-RPC code for an unacceptable parameter value; -32022 belongs to the
   * modern stateless era and is not mixed into the legacy handshake.
   */
  private handleInitialize(id: JsonRpcId, params: McpInitializeParams): JsonRpcResponse {
    const negotiated = negotiateMcpProtocolVersion(params?.protocolVersion);
    if (negotiated.outcome === 'unsupported') {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: `Unsupported MCP protocol version ${negotiated.requested}`,
          data: { requested: negotiated.requested, supported: negotiated.supported },
        },
      };
    }
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: negotiated.version,
        serverInfo: { name: this.serverName, version: this.serverVersion },
        capabilities: { tools: {} },
      },
    };
  }

  /** Returns currently installed tools in the response shape required by the selected era. */
  private async handleToolsList(id: JsonRpcId, modern: boolean): Promise<JsonRpcResponse> {
    if (this.dynamicDiscovery) {
      this.cachedTools = await collectAllTools(this.catalog, this.mcpManager, this.agentId);
    }
    const tools = this.cachedTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
    return {
      jsonrpc: '2.0',
      id,
      result: modern
        ? {
            resultType: 'complete',
            tools,
            _meta: createModernResultMeta(this.serverName, this.serverVersion),
          }
        : { tools },
    };
  }

  /** Invokes an installed tool and stamps modern result metadata when required. */
  private async handleToolsCall(
    id: JsonRpcId,
    params: { name: string; arguments?: Record<string, unknown> },
    modern: boolean,
  ): Promise<JsonRpcResponse> {
    const result = await routeToolCall(
      params.name,
      params.arguments ?? {},
      this.catalog,
      this.mcpManager,
      this.agentId,
    );
    return {
      jsonrpc: '2.0',
      id,
      result: modern
        ? {
            ...result,
            resultType: 'complete',
            _meta: createModernResultMeta(this.serverName, this.serverVersion),
          }
        : result,
    };
  }
}
