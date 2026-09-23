import type { MCPConfig } from '../../../../tools/contracts/mcp.config.ts';
import type { MCPWebSocketConfig } from '../../../../tools/contracts/mcp.web.socket.config.ts';
import type { McpRequestOptions } from '../../contracts/mcp.request.options.ts';
import type { McpTransport } from '../../contracts/mcp.transport.ts';
import { isJsonRpcResponse } from '../../protocol/json-rpc/is.json.rpc.response.ts';
import type { JsonRpcFailure } from '../../protocol/json-rpc/json.rpc.failure.ts';
import type { JsonRpcNotification } from '../../protocol/json-rpc/json.rpc.notification.ts';
import type { JsonRpcRequest } from '../../protocol/json-rpc/json.rpc.request.ts';
import type { JsonRpcResponse } from '../../protocol/json-rpc/json.rpc.response.ts';
import type { JsonRpcSuccess } from '../../protocol/json-rpc/json.rpc.success.ts';
import { McpJsonRpcError } from '../../protocol/json-rpc/mcp.json.rpc.error.ts';
import { asWebSocketConfig } from './as.web.socket.config.ts';
import { getEventData } from './get.event.data.ts';
import type { PendingRequest } from './pending.request.ts';
import type { WebSocketCtor } from './web.socket.ctor.ts';

/** Coordinates the mcp web socket transport behavior. */
export class McpWebSocketTransport implements McpTransport {
  readonly kind = 'ws' as const;
  private readonly config: MCPWebSocketConfig;
  private readonly defaultTimeoutMs: number;
  private readonly socket: ReturnType<typeof this.createSocket>;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly openPromise: Promise<void>;
  private nextRequestId = 1;
  private open = true;

  /** Initializes a new McpWebSocketTransport instance. */
  constructor(config: MCPConfig, defaultTimeoutMs = 15_000) {
    this.config = asWebSocketConfig(config);
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.socket = this.createSocket(this.config.url);
    this.openPromise = this.awaitOpen();
  }

  /** Performs the is open operation. */
  isOpen(): boolean {
    return this.open;
  }

  /** Performs the request operation. */
  async request<TResult = unknown>(method: string, params?: unknown, options: McpRequestOptions = {}): Promise<TResult> {
    this.ensureOpen();
    await this.openPromise;
    const id = this.nextRequestId++;
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      ...(typeof params === 'undefined' ? {} : { params }),
    };

    const responsePromise = new Promise<TResult>((resolve, reject) => {
      const pendingRequest: PendingRequest = {
        resolve: resolve as PendingRequest['resolve'],
        reject,
      };
      if (timeoutMs > 0) {
        pendingRequest.timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`MCP request timed out for method "${method}" after ${timeoutMs}ms`));
        }, timeoutMs);
      }
      this.pending.set(id, pendingRequest);
    });

    this.socket.send(JSON.stringify(request));
    return responsePromise;
  }

  /** Performs the notify operation. */
  async notify(method: string, params?: unknown): Promise<void> {
    this.ensureOpen();
    await this.openPromise;
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      ...(typeof params === 'undefined' ? {} : { params }),
    };
    this.socket.send(JSON.stringify(notification));
  }

  /** Performs the close operation. */
  async close(): Promise<void> {
    if (!this.open) return;
    this.open = false;
    this.socket.close();
    this.failAllPending(new Error('MCP transport is closed.'));
  }

  /** Performs the create socket operation. */
  private createSocket(url: string) {
    const ctor = (globalThis as unknown as { WebSocket?: WebSocketCtor }).WebSocket;
    if (!ctor) {
      throw new Error('WebSocket API is not available in this runtime.');
    }
    const socket = new ctor(url);
    socket.addEventListener('message', (event) => this.onMessage(event));
    socket.addEventListener('error', () => this.failAllPending(new Error('MCP WebSocket transport encountered an error.')));
    socket.addEventListener('close', () => {
      this.open = false;
      this.failAllPending(new Error('MCP WebSocket connection closed.'));
    });
    return socket;
  }

  /** Performs the await open operation. */
  private awaitOpen(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.addEventListener('open', () => resolve());
      this.socket.addEventListener('error', () => reject(new Error('Failed to open MCP WebSocket connection.')));
    });
  }

  /** Performs the on message operation. */
  private onMessage(event: unknown): void {
    const data = getEventData(event);
    if (!data) return;
    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      return;
    }
    if (!isJsonRpcResponse(payload) || typeof payload.id !== 'number') return;
    const responseId = payload.id;
    const response: JsonRpcResponse = payload;
    const pending = this.pending.get(responseId);
    if (!pending) return;
    this.pending.delete(responseId);
    if (pending.timer) clearTimeout(pending.timer);
    if ('error' in response) {
      const error = response as JsonRpcFailure;
      pending.reject(new McpJsonRpcError(error.error.code, error.error.message, error.error.data));
      return;
    }
    pending.resolve((response as JsonRpcSuccess).result);
  }

  /** Performs the ensure open operation. */
  private ensureOpen(): void {
    if (!this.open) {
      throw new Error('MCP transport is closed.');
    }
  }

  /** Performs the fail all pending operation. */
  private failAllPending(error: unknown): void {
    for (const [id, pending] of this.pending) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }
  }
}
