import type { AgentCatalogStore } from '../../catalog/store/agent.catalog.store.ts';
import { canLlmAccessResource } from '../../access/policy/can.llm.access.resource.ts';
import { AgentMcpManager } from '../manager/manager/agent.mcp.manager.ts';
import type { McpCallToolResult } from '../runtime/protocol/json-rpc/mcp.call.tool.result.ts';
import type { McpToolEntry } from './contracts/mcp.tool.entry.ts';

/**
 * Route a tool call to its origin package.
 *
 * Tool names follow the convention:
 *  - skill / tool packages: `<name>` (origin stored in the entry's `origin` field)
 *  - MCP proxied tools:     `<serverName>__<toolName>`
 */
export async function routeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  catalog: AgentCatalogStore,
  mcpManager: AgentMcpManager,
  agentId?: string,
  tools: McpToolEntry[] = [],
): Promise<McpCallToolResult> {
  // MCP proxied tool. The exposed name is sanitized for the agent identifier
  // charset, so it cannot be split back into the real server id; the entry's
  // `origin` carries that id and is the authoritative mapping.
  const proxied = tools.find((entry) => entry.name === toolName && entry.origin.startsWith('mcp:'));
  if (proxied) {
    const serverName = proxied.origin.slice('mcp:'.length);
    const mcpToolName = toolName.slice(toolName.indexOf('__') + 2);
    return mcpManager.callTool(serverName, mcpToolName, args, { llmId: agentId });
  }

  // Skill or tool package
  const pkg = catalog.getInstalledPackages().find(
    (p) => p.enabled && (p.type === 'skill' || p.type === 'tool') && p.name === toolName,
  );

  if (!pkg) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Tool "${toolName}" not found in maia catalog.` }],
    };
  }

  if (!canLlmAccessResource(
    agentId,
    pkg.type,
    pkg.name,
    undefined,
    pkg.allowedLlms,
    catalog.getLlmAccessDefault(),
  )) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Tool "${toolName}" is not allowed for agent "${agentId ?? 'unknown'}".` }],
    };
  }

  try {
    const runtime = await catalog.loadRuntimeModule(pkg.type, pkg.name);
    const key = pkg.type === 'skill' ? 'skill' : 'tool';
    if (!runtime || typeof runtime !== 'object' || !(key in runtime)) {
      throw new Error(`Module for ${pkg.type} "${pkg.name}" does not export a "${key}" object`);
    }
    const mod = (runtime as Record<string, { execute: (input: unknown) => Promise<unknown> }>)[key];
    const result = await mod.execute(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
    };
  }
}
