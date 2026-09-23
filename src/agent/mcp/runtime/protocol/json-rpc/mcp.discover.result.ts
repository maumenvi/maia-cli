import type { McpResultMeta } from './mcp.result.meta.ts';

/** Advertises modern MCP versions, server capabilities, identity, and cache guidance. */
export interface McpDiscoverResult {
  resultType: 'complete';
  supportedVersions: string[];
  capabilities: Record<string, unknown>;
  instructions?: string;
  ttlMs?: number;
  cacheScope?: 'public' | 'private';
  _meta?: McpResultMeta;
}

