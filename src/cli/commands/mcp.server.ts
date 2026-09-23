import { createMcpStdioServer } from '../../agent/mcp/server/create.mcp.stdio.server.ts';
import type { CommandHandler } from '../contracts/command.handler.ts';
import { parseFlags } from '../shared/flags/parse.flags.ts';

/** Performs the mcp server command operation. */
export const mcpServerCommand: CommandHandler = async (args, { store }) => {
  const { flags } = parseFlags(args);
  const dynamic = flags.dynamic === 'true' || flags.dynamic === '1';

  const server = createMcpStdioServer(store, {
    name: flags.name ?? 'maia-mcp-server',
    version: flags.version ?? '1.0.0',
    dynamicDiscovery: dynamic,
    agentId: flags.agent,
  });

  await server.start();
};
