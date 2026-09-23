import type { MCPConfig } from '../../../agent/tools/contracts/mcp.config.ts';
import { toStringMap } from './to.string.map.ts';

/** Performs the create mcp config operation. */
export function createMcpConfig(name: string, flags: Record<string, string>): MCPConfig {
  const parsedArgs = flags.args ? JSON.parse(flags.args) : [];
  const parsedEnv = flags.env ? JSON.parse(flags.env) : {};
  const parsedHeaders = flags.headers ? JSON.parse(flags.headers) : {};
  const parsedNpxArgs = flags.npxArgs ? JSON.parse(flags.npxArgs) : ['-y'];
  const transport = String(flags.transport ?? 'stdio');

  if (transport === 'http' || transport === 'ws' || transport === 'sse') {
    const url = String(flags.url ?? '');
    if (!url) {
      throw new Error(`Usage for ${transport.toUpperCase()} MCP: maia i mcp <name> --transport ${transport} --url <endpoint>`);
    }
    return { transport, url, headers: toStringMap(parsedHeaders) };
  }

  if (transport === 'npx') {
    return {
      transport: 'npx',
      package: String(flags.package ?? `@modelcontextprotocol/server-${name}`),
      args: Array.isArray(parsedArgs) ? parsedArgs.map(String) : [],
      env: toStringMap(parsedEnv),
      npxArgs: Array.isArray(parsedNpxArgs) ? parsedNpxArgs.map(String) : ['-y'],
    };
  }

  return {
    transport: 'stdio',
    command: flags.command ?? 'npx',
    args: Array.isArray(parsedArgs) ? parsedArgs.map(String) : [],
    env: toStringMap(parsedEnv),
  };
}
