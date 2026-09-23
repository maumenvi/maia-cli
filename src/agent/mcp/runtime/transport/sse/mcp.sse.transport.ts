import type { MCPConfig } from '../../../../tools/contracts/mcp.config.ts';
import type { MCPSseConfig } from '../../../../tools/contracts/mcp.sse.config.ts';
import type { McpRequestOptions } from '../../contracts/mcp.request.options.ts';
import { McpTransportError } from '../../contracts/mcp.transport.error.ts';
import type { McpTransport } from '../../contracts/mcp.transport.ts';
import type { JsonRpcFailure } from '../../protocol/json-rpc/json.rpc.failure.ts';
import type { JsonRpcNotification } from '../../protocol/json-rpc/json.rpc.notification.ts';
import type { JsonRpcRequest } from '../../protocol/json-rpc/json.rpc.request.ts';
import type { JsonRpcSuccess } from '../../protocol/json-rpc/json.rpc.success.ts';
import { McpJsonRpcError } from '../../protocol/json-rpc/mcp.json.rpc.error.ts';
import { createMcpRequestHeaders } from '../shared/create.mcp.request.headers.ts';
import { asSseConfig } from './as.sse.config.ts';
import { parseSseOrJson } from './parse.sse.or.json.ts';

/** Coordinates the mcp sse transport behavior. */
export class McpSseTransport implements McpTransport {
  readonly kind = 'sse' as const;
  private readonly config: MCPSseConfig;
  private readonly defaultTimeoutMs: number;
  private nextRequestId = 1;
  private open = true;

  /** Initializes a new McpSseTransport instance. */
  constructor(config: MCPConfig, defaultTimeoutMs = 15_000) {
    this.config = asSseConfig(config);
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  /** Performs the is open operation. */
  isOpen(): boolean {
    return this.open;
  }

  /** Performs the request operation. */
  async request<TResult = unknown>(method: string, params?: unknown, options: McpRequestOptions = {}): Promise<TResult> {
    this.ensureOpen();
    const id = this.nextRequestId++;
    const payload: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      ...(typeof params === 'undefined' ? {} : { params }),
    };
    const response = await this.send(payload, options.timeoutMs ?? this.defaultTimeoutMs, options);
    if ('error' in response) {
      const failure = response as JsonRpcFailure;
      throw new McpJsonRpcError(failure.error.code, failure.error.message, failure.error.data);
    }
    return (response as JsonRpcSuccess<TResult>).result;
  }

  /** Performs the notify operation. */
  async notify(method: string, params?: unknown, options: McpRequestOptions = {}): Promise<void> {
    this.ensureOpen();
    const payload: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      ...(typeof params === 'undefined' ? {} : { params }),
    };
    await this.send(payload, this.defaultTimeoutMs, options, true);
  }

  /** Performs the close operation. */
  async close(): Promise<void> {
    this.open = false;
  }

  /** Performs the ensure open operation. */
  private ensureOpen(): void {
    if (!this.open) {
      throw new Error('MCP transport is closed.');
    }
  }

  /** Performs the send operation. */
  private async send(
    payload: JsonRpcRequest | JsonRpcNotification,
    timeoutMs: number,
    options: McpRequestOptions,
    allowEmpty = false,
  ): Promise<JsonRpcSuccess | JsonRpcFailure> {
    const controller = new AbortController();
    const timer = timeoutMs > 0
      ? setTimeout(() => controller.abort(new Error(`MCP request timed out after ${timeoutMs}ms`)), timeoutMs)
      : undefined;
    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          ...(this.config.headers ?? {}),
          ...createMcpRequestHeaders(payload.method, payload.params, options),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        if (text.trim()) {
          try {
            const decoded = parseSseOrJson(text);
            if (decoded.jsonrpc === '2.0' && 'error' in decoded) {
              return decoded;
            }
          } catch {
            // The response is intentionally classified as an unstructured transport failure below.
          }
        }
        throw new McpTransportError(
          `MCP SSE transport failed with status ${response.status}`,
          response.status,
          false,
        );
      }
      if (!text.trim()) {
        if (allowEmpty) {
          return { jsonrpc: '2.0', id: -1, result: {} };
        }
        throw new Error('MCP SSE transport returned an empty response body.');
      }
      const decoded = parseSseOrJson(text);
      if (decoded.jsonrpc !== '2.0') {
        throw new Error('MCP SSE transport returned invalid JSON-RPC payload.');
      }
      return decoded;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`MCP request timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
