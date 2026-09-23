import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

import { loadMcpEnvFromCurrentProject } from '../../../../../config/core/load.mcp.env.from.current.project.ts';
import type { MCPConfig } from '../../../../tools/contracts/mcp.config.ts';
import type { MCPStdioConfig } from '../../../../tools/contracts/mcp.stdio.config.ts';
import type { McpRequestOptions } from '../../contracts/mcp.request.options.ts';
import type { McpTransport } from '../../contracts/mcp.transport.ts';
import { encodeMcpMessage } from '../../protocol/framing/encode.mcp.message.ts';
import { McpMessageDecoder } from '../../protocol/framing/mcp.message.decoder.ts';
import { isJsonRpcResponse } from '../../protocol/json-rpc/is.json.rpc.response.ts';
import type { JsonRpcFailure } from '../../protocol/json-rpc/json.rpc.failure.ts';
import type { JsonRpcNotification } from '../../protocol/json-rpc/json.rpc.notification.ts';
import type { JsonRpcRequest } from '../../protocol/json-rpc/json.rpc.request.ts';
import type { JsonRpcResponse } from '../../protocol/json-rpc/json.rpc.response.ts';
import type { JsonRpcSuccess } from '../../protocol/json-rpc/json.rpc.success.ts';
import { McpJsonRpcError } from '../../protocol/json-rpc/mcp.json.rpc.error.ts';
import { asStdioConfig } from './as.stdio.config.ts';
import { assertRequiredEnv } from './assert.required.env.ts';
import type { PendingRequest } from './pending.request.ts';
import { redactSecretsFromStream } from './redact.secrets.from.stream.ts';
import { resolveRuntimeEnv } from './resolve.runtime.env.ts';
import { resolveSafeInheritedEnv } from './resolve.safe.inherited.env.ts';

/** Coordinates the mcp stdio transport behavior. */
export class McpStdioTransport implements McpTransport {
  readonly kind = 'stdio' as const;
  private readonly config: MCPStdioConfig;
  private readonly defaultTimeoutMs: number;
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly decoder = new McpMessageDecoder();
  private readonly pending = new Map<number, PendingRequest>();
  private readonly injectedEnv: Record<string, string>;
  private nextRequestId = 1;
  private open = true;

  /** Initializes a new McpStdioTransport instance. */
  constructor(config: MCPConfig, defaultTimeoutMs = 15_000) {
    this.config = asStdioConfig(config);
    this.defaultTimeoutMs = defaultTimeoutMs;
    loadMcpEnvFromCurrentProject();
    // Fail before spawning: an unresolved placeholder would otherwise become an
    // empty credential and surface later as an unrelated transport error.
    assertRequiredEnv(this.config.env);
    const runtimeEnv = resolveRuntimeEnv(this.config.env);
    this.injectedEnv = runtimeEnv;
    this.child = spawn(this.config.command, this.config.args ?? [], {
      stdio: 'pipe',
      env: {
        ...resolveSafeInheritedEnv(),
        ...runtimeEnv,
      },
    });

    this.child.stdout.on('data', (chunk: Buffer) => this.onStdout(chunk));
    // Never relay the child's stderr verbatim: a server echoing its own config
    // would print an injected credential to the user's terminal (SC-003).
    this.child.stderr.on('data', (chunk: Buffer) => {
      process.stderr.write(redactSecretsFromStream(chunk.toString('utf8'), this.injectedEnv));
    });
    this.child.on('error', (err) => {
      this.open = false;
      this.failAllPending(err);
    });
    this.child.on('exit', (code, signal) => {
      const reason = new Error(`MCP process exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`);
      this.open = false;
      this.failAllPending(reason);
    });
  }

  /** Performs the is open operation. */
  isOpen(): boolean {
    return this.open;
  }

  /** Performs the request operation. */
  async request<TResult = unknown>(method: string, params?: unknown, options: McpRequestOptions = {}): Promise<TResult> {
    this.ensureOpen();
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

    this.child.stdin.write(encodeMcpMessage(request));
    return responsePromise;
  }

  /** Performs the notify operation. */
  async notify(method: string, params?: unknown): Promise<void> {
    this.ensureOpen();
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      ...(typeof params === 'undefined' ? {} : { params }),
    };
    this.child.stdin.write(encodeMcpMessage(notification));
  }

  /** Performs the close operation. */
  async close(): Promise<void> {
    if (!this.open) return;
    this.open = false;
    this.child.stdin.end();
    this.child.kill('SIGTERM');
  }

  /** Performs the on stdout operation. */
  private onStdout(chunk: Buffer): void {
    const messages = this.decoder.push(chunk);
    for (const message of messages) {
      if (!isJsonRpcResponse(message) || typeof message.id !== 'number') {
        continue;
      }
      const responseId = message.id;
      const response: JsonRpcResponse = message;
      const pending = this.pending.get(responseId);
      if (!pending) {
        continue;
      }
      this.pending.delete(responseId);
      if (pending.timer) {
        clearTimeout(pending.timer);
      }

      if ('error' in response) {
        const error = response as JsonRpcFailure;
        pending.reject(new McpJsonRpcError(error.error.code, error.error.message, error.error.data));
      } else {
        pending.resolve((response as JsonRpcSuccess).result);
      }
    }
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
