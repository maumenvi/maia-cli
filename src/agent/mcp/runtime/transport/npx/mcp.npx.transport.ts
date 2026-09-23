import type { MCPConfig } from '../../../../tools/contracts/mcp.config.ts';
import type { MCPStdioConfig } from '../../../../tools/contracts/mcp.stdio.config.ts';
import type { McpRequestOptions } from '../../contracts/mcp.request.options.ts';
import type { McpTransport } from '../../contracts/mcp.transport.ts';
import { McpStdioTransport } from '../stdio/mcp.stdio.transport.ts';
import { asNpxConfig } from './as.npx.config.ts';

/** Coordinates the mcp npx transport behavior. */
export class McpNpxTransport implements McpTransport {
  readonly kind = 'npx' as const;
  private readonly stdioTransport: McpStdioTransport;

  /** Initializes a new McpNpxTransport instance. */
  constructor(config: MCPConfig, defaultTimeoutMs = 15_000) {
    const npxConfig = asNpxConfig(config);
    const stdioConfig: MCPStdioConfig = {
      transport: 'stdio',
      command: 'npx',
      args: [...(npxConfig.npxArgs ?? ['-y']), npxConfig.package, ...(npxConfig.args ?? [])],
      env: npxConfig.env,
    };
    this.stdioTransport = new McpStdioTransport(stdioConfig, defaultTimeoutMs);
  }

  /** Performs the is open operation. */
  isOpen(): boolean {
    return this.stdioTransport.isOpen();
  }

  /** Performs the request operation. */
  request<TResult = unknown>(method: string, params?: unknown, options?: McpRequestOptions): Promise<TResult> {
    return this.stdioTransport.request<TResult>(method, params, options);
  }

  /** Performs the notify operation. */
  notify(method: string, params?: unknown): Promise<void> {
    return this.stdioTransport.notify(method, params);
  }

  /** Performs the close operation. */
  close(): Promise<void> {
    return this.stdioTransport.close();
  }
}
