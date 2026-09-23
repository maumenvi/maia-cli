import type { MCPHttpConfig } from './mcp.http.config.ts';
import type { MCPNpxConfig } from './mcp.npx.config.ts';
import type { MCPSseConfig } from './mcp.sse.config.ts';
import type { MCPStdioConfig } from './mcp.stdio.config.ts';
import type { MCPWebSocketConfig } from './mcp.web.socket.config.ts';

/** Defines the mcp config type. */
export type MCPConfig = MCPStdioConfig | MCPHttpConfig | MCPSseConfig | MCPWebSocketConfig | MCPNpxConfig;
