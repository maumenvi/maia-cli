import { McpTransportError } from '../contracts/mcp.transport.error.ts';
import type { McpTransport } from '../contracts/mcp.transport.ts';
import { McpJsonRpcError } from '../protocol/json-rpc/mcp.json.rpc.error.ts';

/** Classifies failed modern probes without downgrading recognized modern protocol errors. */
export function shouldFallbackToLegacy(error: unknown, transport: McpTransport): boolean {
  if (error instanceof McpJsonRpcError) {
    return error.code === -32601;
  }
  if (error instanceof McpTransportError) {
    return !error.structuredProtocolError
      && (error.status === 400 || error.status === 404 || error.status === 405);
  }
  if (error instanceof Error
    && (/^spawn /i.test(error.message)
      || /MCP process exited/i.test(error.message)
      || /MCP transport is closed/i.test(error.message))) {
    return false;
  }
  return transport.kind === 'stdio'
    || transport.kind === 'npx'
    || transport.kind === 'ws'
    || transport.kind === 'custom'
    || typeof transport.kind === 'undefined';
}
