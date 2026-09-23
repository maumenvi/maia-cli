import { MAIA_PACKAGE_METADATA } from '../../../../../shared/package.metadata.ts';
import type { McpClient } from '../../contracts/mcp.client.ts';
import type { McpRequestOptions } from '../../contracts/mcp.request.options.ts';
import type { McpTransport } from '../../contracts/mcp.transport.ts';
import { assertLegacyMcpProtocolVersion } from '../../protocol/json-rpc/assert.legacy.mcp.protocol.version.ts';
import type { McpCallToolResult } from '../../protocol/json-rpc/mcp.call.tool.result.ts';
import type { McpDiscoverResult } from '../../protocol/json-rpc/mcp.discover.result.ts';
import type { McpInitializeResult } from '../../protocol/json-rpc/mcp.initialize.result.ts';
import type { McpListToolsResult } from '../../protocol/json-rpc/mcp.list.tools.result.ts';
import type { McpProtocolEra } from '../../protocol/json-rpc/mcp.protocol.era.ts';
import type { McpProtocolVersion } from '../../protocol/json-rpc/mcp.protocol.version.ts';
import type { McpToolDescriptor } from '../../protocol/json-rpc/mcp.tool.descriptor.ts';
import { negotiateMcpProtocolVersion } from '../../protocol/json-rpc/negotiate.mcp.protocol.version.ts';
import { MCP_MODERN_PROTOCOL_VERSION } from '../../protocol/json-rpc/protocol.versions.ts';
import { createToolParameterHeaders } from '../create.tool.parameter.headers.ts';
import { shouldFallbackToLegacy } from '../should.fallback.to.legacy.ts';
import { withModernRequestMeta } from '../with.modern.request.meta.ts';

/** Negotiates an MCP protocol era and exposes stateless or stateful tool operations. */
export class JsonRpcMcpClient implements McpClient {
  private readonly transport: McpTransport;
  private readonly tools = new Map<string, McpToolDescriptor>();
  private initialized = false;
  private protocolEra?: McpProtocolEra;
  private protocolVersion?: McpProtocolVersion;

  /** Creates a protocol client over an already configured transport. */
  constructor(transport: McpTransport) {
    this.transport = transport;
  }

  /** Probes modern discovery first and safely falls back to the legacy initialize handshake. */
  async initialize(options: McpRequestOptions = {}): Promise<McpInitializeResult> {
    if (this.initialized) {
      return { protocolVersion: this.protocolVersion };
    }

    let discover: McpDiscoverResult | undefined;
    try {
      const probeTimeout = Math.min(options.timeoutMs ?? 15_000, 5_000);
      discover = await this.transport.request<McpDiscoverResult>(
        'server/discover',
        withModernRequestMeta(),
        {
          ...options,
          timeoutMs: probeTimeout,
          protocolVersion: MCP_MODERN_PROTOCOL_VERSION,
        },
      );
    } catch (error) {
      if (!shouldFallbackToLegacy(error, this.transport)) {
        throw error;
      }
    }

    if (discover) {
      if (!Array.isArray(discover.supportedVersions)
        || !discover.supportedVersions.includes(MCP_MODERN_PROTOCOL_VERSION)) {
        throw new Error(
          `Modern MCP discovery did not advertise ${MCP_MODERN_PROTOCOL_VERSION}.`,
        );
      }
      this.protocolEra = 'modern';
      this.protocolVersion = MCP_MODERN_PROTOCOL_VERSION;
      this.initialized = true;
      return {
        protocolVersion: MCP_MODERN_PROTOCOL_VERSION,
        capabilities: discover.capabilities,
        serverInfo: discover._meta?.['io.modelcontextprotocol/serverInfo'],
      };
    }

    return this.initializeLegacy(options);
  }

  /** Lists tools with the metadata envelope required by the negotiated era. */
  async listTools(options: McpRequestOptions = {}): Promise<McpListToolsResult> {
    await this.ensureInitialized(options);
    const result = await this.transport.request<McpListToolsResult>(
      'tools/list',
      this.modernParams({}),
      this.protocolOptions(options),
    );
    const tools = Array.isArray(result.tools) ? result.tools : [];
    for (const descriptor of tools) {
      this.tools.set(descriptor.name, descriptor);
    }
    return { ...result, tools };
  }

  /** Invokes a tool and mirrors any modern HTTP parameter-header annotations. */
  async callTool(
    name: string,
    args: Record<string, unknown> = {},
    options: McpRequestOptions = {},
  ): Promise<McpCallToolResult> {
    await this.ensureInitialized(options);
    if (this.protocolEra === 'modern'
      && (this.transport.kind === 'http' || this.transport.kind === 'sse')
      && !this.tools.has(name)) {
      await this.listTools(options);
    }
    const parameterHeaders = this.protocolEra === 'modern'
      ? createToolParameterHeaders(this.tools.get(name), args)
      : {};
    return this.transport.request<McpCallToolResult>(
      'tools/call',
      this.modernParams({ name, arguments: args }),
      this.protocolOptions({
        ...options,
        headers: { ...options.headers, ...parameterHeaders },
      }),
    );
  }

  /** Closes the negotiated protocol lifecycle without sending removed modern RPCs. */
  async shutdown(options: McpRequestOptions = {}): Promise<void> {
    if (!this.initialized) return;
    if (this.protocolEra === 'legacy') {
      await this.transport.request('shutdown', {}, this.protocolOptions(options));
      await this.transport.notify('exit', {}, this.protocolOptions(options));
    }
    this.initialized = false;
    this.protocolEra = undefined;
    this.protocolVersion = undefined;
    this.tools.clear();
  }

  /** Returns the era selected during connection. */
  getProtocolEra(): McpProtocolEra | undefined {
    return this.protocolEra;
  }

  /** Returns the dated protocol revision selected during connection. */
  getProtocolVersion(): McpProtocolVersion | undefined {
    return this.protocolVersion;
  }

  /** Completes the initialize/initialized lifecycle for a stateful server. */
  private async initializeLegacy(options: McpRequestOptions): Promise<McpInitializeResult> {
    // The client picks its own preferred revision; calling without an argument
    // always negotiates successfully, so only the version is needed here.
    const negotiated = negotiateMcpProtocolVersion();
    const requestedVersion = negotiated.outcome === 'negotiated'
      ? negotiated.version
      : undefined;
    const result = await this.transport.request<McpInitializeResult>('initialize', {
      protocolVersion: requestedVersion,
      capabilities: {},
      clientInfo: {
        name: 'maia',
        version: MAIA_PACKAGE_METADATA.version,
      },
    }, {
      ...options,
      protocolVersion: requestedVersion,
    });
    const protocolVersion = assertLegacyMcpProtocolVersion(result?.protocolVersion);
    await this.transport.notify('notifications/initialized', {}, {
      ...options,
      protocolVersion,
    });
    this.protocolEra = 'legacy';
    this.protocolVersion = protocolVersion;
    this.initialized = true;
    return { ...result, protocolVersion };
  }

  /** Adds stateless request metadata only after modern negotiation succeeds. */
  private modernParams(params: Record<string, unknown>): Record<string, unknown> {
    return this.protocolEra === 'modern' ? withModernRequestMeta(params) : params;
  }

  /** Adds the negotiated protocol revision to transport-level request metadata. */
  private protocolOptions(options: McpRequestOptions): McpRequestOptions {
    return {
      ...options,
      protocolVersion: this.protocolVersion,
    };
  }

  /** Connects lazily before the first tool operation. */
  private async ensureInitialized(options: McpRequestOptions): Promise<void> {
    if (this.initialized) return;
    await this.initialize(options);
  }
}
