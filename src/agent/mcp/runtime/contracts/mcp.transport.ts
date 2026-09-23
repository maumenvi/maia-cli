import type { McpRequestOptions } from './mcp.request.options.ts';
import type { McpTransportKind } from './mcp.transport.kind.ts';

/** Provides request, notification, and lifecycle operations over an MCP wire transport. */
export interface McpTransport {
  readonly kind?: McpTransportKind;
  /** Performs the request operation. */
  request<TResult = unknown>(method: string, params?: unknown, options?: McpRequestOptions): Promise<TResult>;
  /** Performs the notify operation. */
  notify(method: string, params?: unknown, options?: McpRequestOptions): Promise<void>;
  /** Performs the close operation. */
  close(): Promise<void>;
  /** Performs the is open operation. */
  isOpen(): boolean;
}

