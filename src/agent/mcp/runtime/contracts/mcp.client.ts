import type { McpCallToolResult } from '../protocol/json-rpc/mcp.call.tool.result.ts';
import type { McpInitializeResult } from '../protocol/json-rpc/mcp.initialize.result.ts';
import type { McpListToolsResult } from '../protocol/json-rpc/mcp.list.tools.result.ts';
import type { McpProtocolEra } from '../protocol/json-rpc/mcp.protocol.era.ts';
import type { McpProtocolVersion } from '../protocol/json-rpc/mcp.protocol.version.ts';
import type { McpRequestOptions } from './mcp.request.options.ts';

/** Exposes the MCP lifecycle and tool operations used by Maia's manager. */
export interface McpClient {
  /** Performs the initialize operation. */
  initialize(options?: McpRequestOptions): Promise<McpInitializeResult>;
  /** Performs the list tools operation. */
  listTools(options?: McpRequestOptions): Promise<McpListToolsResult>;
  /** Performs the call tool operation. */
  callTool(name: string, args?: Record<string, unknown>, options?: McpRequestOptions): Promise<McpCallToolResult>;
  /** Performs the shutdown operation. */
  shutdown(options?: McpRequestOptions): Promise<void>;
  /** Performs the get protocol era operation. */
  getProtocolEra(): McpProtocolEra | undefined;
  /** Performs the get protocol version operation. */
  getProtocolVersion(): McpProtocolVersion | undefined;
}

