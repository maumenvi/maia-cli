import { canLlmAccessResource } from '../../../access/policy/can.llm.access.resource.ts';
import { resolveAllowedLlms } from '../../../access/policy/resolve.allowed.llms.ts';
import { syncVsCodeMcpConfig } from '../../../catalog/context/sync-mcp/sync.vs.code.mcp.config.ts';
import { AgentCatalogStore } from '../../../catalog/store/agent.catalog.store.ts';
import type { McpDependency } from '../../../catalog/types/dependencies/mcp.dependency.ts';
import type { Repository } from '../../../tools/contracts/repository.ts';
import type { McpHealthcheckResult } from '../../reliability/contracts/mcp.healthcheck.result.ts';
import type { McpOperationOptions } from '../../reliability/contracts/mcp.operation.options.ts';
import type { McpReliabilityConfig } from '../../reliability/contracts/mcp.reliability.config.ts';
import type { McpSession } from '../../runtime/contracts/mcp.session.ts';
import type { McpCallToolResult } from '../../runtime/protocol/json-rpc/mcp.call.tool.result.ts';
import type { McpToolDescriptor } from '../../runtime/protocol/json-rpc/mcp.tool.descriptor.ts';
import { DEFAULT_RELIABILITY_CONFIG } from '../defaults.ts';
import { describeManager } from '../describe.ts';
import { McpResilienceController } from '../resilience/mcp.resilience.controller.ts';
import { toErrorMessage } from '../resilience/to.error.message.ts';
import { ensureHealthySession } from '../session/ensure.healthy.session.ts';
import { getOrStartSession } from '../session/get.or.start.session.ts';
import { invalidateSession } from '../session/invalidate.session.ts';
import { stopSession } from '../session/stop.session.ts';
import type { LlmAccessPolicyProvider } from './llm.access.policy.provider.ts';

/** Coordinates the agent mcp manager behavior. */
export class AgentMcpManager {
  private readonly repositories: Repository[] = [];
  private readonly catalog: AgentCatalogStore;
  private readonly sessions = new Map<string, McpSession>();
  private readonly reliability: McpReliabilityConfig;
  private readonly resilience: McpResilienceController;
  private readonly llmAccessPolicies?: LlmAccessPolicyProvider;

  /** Initializes a new AgentMcpManager instance. */
  constructor(catalog = new AgentCatalogStore(), reliability: Partial<McpReliabilityConfig> = {}, llmAccessPolicies?: LlmAccessPolicyProvider) {
    this.catalog = catalog;
    this.reliability = {
      ...DEFAULT_RELIABILITY_CONFIG,
      ...reliability,
    };
    this.resilience = new McpResilienceController(this.reliability);
    this.llmAccessPolicies = llmAccessPolicies;
  }

  /** Performs the add operation. */
  add(repo: Repository): AgentMcpManager {
    return this.addRepository(repo);
  }

  /** Performs the add repository operation. */
  addRepository(repo: Repository): AgentMcpManager {
    this.repositories.push(repo);
    if (repo.url) {
      this.catalog.addSource(repo.name ?? `source-${this.repositories.length}`, {
        type: 'git',
        url: repo.url,
        ref: repo.ref ?? 'main',
        trusted: repo.trusted ?? false,
      });
    }
    return this;
  }

  /** Performs the list operation. */
  list(options: { llmId?: string } = {}): Array<{ name: string; description: string; type: string; url?: string; allowedLlms: string[] }> {
    const defaultPolicy = this.catalog.getLlmAccessDefault();
    const installed = this.catalog.getInstalledPackages('mcp').map((entry) => ({
      name: entry.name,
      description: `MCP ${entry.name} from ${entry.source}@${entry.version}`,
      type: 'git',
      url: entry.provenance.repo,
      allowedLlms: resolveAllowedLlms(entry.allowedLlms, defaultPolicy),
    }));
    const merged = [...installed, ...this.repositories.map((repo) => ({
      name: repo.name ?? repo.url ?? repo.type,
      description: `MCP registry entry from ${repo.type}: ${repo.url ?? repo.name ?? repo.type}`,
      type: repo.type,
      url: repo.url,
      allowedLlms: ['*'],
    }))];
    const llmId = options.llmId;
    return merged.filter((item) => this.isLlmAllowed(llmId, item.name, item.allowedLlms));
  }

  /** Performs the install operation. */
  async install(identifier: string, repoOrConfig?: Repository | McpDependency): Promise<AgentMcpManager> {
    if (repoOrConfig && 'type' in repoOrConfig) {
      return this.addRepository(repoOrConfig);
    }

    if (repoOrConfig && 'vscode' in repoOrConfig) {
      this.catalog.addDependency('mcp', identifier, repoOrConfig);
      this.catalog.buildLock();
      return this;
    }

    const discovered = this.catalog.discover('mcp', identifier, 1)[0];
    const defaultVscode = discovered
      ? {
          command: `npx`,
          args: ['-y', `@modelcontextprotocol/server-${identifier}`],
          env: {},
        }
      : {
          command: identifier,
          args: [],
          env: {},
        };
    this.catalog.addDependency('mcp', identifier, {
      version: '*',
      source: 'local',
      enabled: true,
      capabilities: [],
      constraints: [],
      allowedLlms: ['*'],
      vscode: defaultVscode,
    });
    this.catalog.buildLock();
    return this;
  }

  /** Performs the install with vscode operation. */
  async installWithVscode(identifier: string, dependency: McpDependency): Promise<AgentMcpManager> {
    await this.install(identifier, dependency);
    return this;
  }

  /** Performs the sync vs code config operation. */
  async syncVsCodeConfig(): Promise<ReturnType<typeof syncVsCodeMcpConfig>> {
    return this.catalog.syncVsCodeMcp();
  }

  /** Performs the start server operation. */
  async startServer(serverName: string, options: McpOperationOptions = {}): Promise<McpSession> {
    this.assertLlmAccess(options.llmId, serverName);
    return this.resilience.executeWithResilience(
      serverName,
      options,
      () => getOrStartSession(this.catalog, this.sessions, serverName, options.timeoutMs),
      () => invalidateSession(this.sessions, serverName),
    );
  }

  /** Performs the stop server operation. */
  async stopServer(serverName: string, options: { timeoutMs?: number } = {}): Promise<void> {
    await stopSession(this.sessions, serverName, options.timeoutMs);
  }

  /** Performs the list tools operation. */
  async listTools(serverName: string, options: McpOperationOptions = {}): Promise<McpToolDescriptor[]> {
    this.assertLlmAccess(options.llmId, serverName);
    return this.resilience.executeWithResilience(
      serverName,
      options,
      async () => {
        const session = await getOrStartSession(this.catalog, this.sessions, serverName, options.timeoutMs);
        const result = await session.client.listTools({ timeoutMs: options.timeoutMs });
        session.lastHealthcheckAt = Date.now();
        return result.tools;
      },
      () => invalidateSession(this.sessions, serverName),
    );
  }

  /** Performs the call tool operation. */
  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown> = {},
    options: McpOperationOptions = {},
  ): Promise<McpCallToolResult> {
    this.assertLlmAccess(options.llmId, serverName);
    return this.resilience.executeWithResilience(
      serverName,
      options,
      async () => {
        const session = await getOrStartSession(this.catalog, this.sessions, serverName, options.timeoutMs);
        await ensureHealthySession(session, this.reliability, options.timeoutMs);
        const result = await session.client.callTool(toolName, args, { timeoutMs: options.timeoutMs });
        session.lastHealthcheckAt = Date.now();
        return result;
      },
      async (error) => {
        if (this.shouldInvalidateSessionAfterFailure(error)) {
          await invalidateSession(this.sessions, serverName);
        }
      },
    );
  }

  /** Performs the healthcheck operation. */
  async healthcheck(serverName: string, options: McpOperationOptions = {}): Promise<McpHealthcheckResult> {
    this.assertLlmAccess(options.llmId, serverName);
    const checkedAt = Date.now();
    try {
      const session = await getOrStartSession(this.catalog, this.sessions, serverName, options.timeoutMs);
      await session.client.listTools({ timeoutMs: options.timeoutMs });
      session.lastHealthcheckAt = checkedAt;
      session.status = 'running';
      this.resilience.recordSuccess(serverName);
      return {
        serverName,
        ok: true,
        checkedAt,
        status: 'running',
      };
    } catch (error) {
      const message = toErrorMessage(error);
      this.resilience.recordFailure(serverName, message);
      await invalidateSession(this.sessions, serverName);
      return {
        serverName,
        ok: false,
        checkedAt,
        status: 'failed',
        error: message,
      };
    }
  }

  /** Performs the shutdown all operation. */
  async shutdownAll(options: { timeoutMs?: number } = {}): Promise<void> {
    const names = [...this.sessions.keys()];
    for (const name of names) {
      await this.stopServer(name, options);
    }
  }

  /** Performs the discover operation. */
  async discover(query = '', limit = 10, options: { llmId?: string } = {}) {
    const search = query.trim().toLowerCase();
    const entries = this.catalog.discover('mcp', search, limit);
    return entries
      .filter((entry) => this.isLlmAllowed(options.llmId, entry.name, entry.allowedLlms))
      .map((entry) => ({
      name: entry.name,
      description: entry.description,
    }));
  }

  /** Performs the describe operation. */
  describe() {
    return describeManager(
      this.catalog,
      this.repositories,
      this.sessions,
      this.reliability,
      this.resilience.describeCircuits(),
    );
  }

  /** Performs the should invalidate session after failure operation. */
  private shouldInvalidateSessionAfterFailure(error: unknown): boolean {
    const message = toErrorMessage(error).toLowerCase();
    if (message.includes('mcp process exited')) return true;
    if (message.includes('mcp transport is closed')) return true;
    if (message.includes('request timed out')) return true;
    if (message.includes('spawn ')) return true;
    if (message.includes('http transport failed')) return true;
    if (message.includes('sse transport failed')) return true;
    if (message.includes('websocket transport')) return true;
    if (message.includes('fetch failed')) return true;
    return false;
  }

  /** Performs the is llm allowed operation. */
  private isLlmAllowed(llmId: string | undefined, serverName: string, allowedLlms?: string[]): boolean {
    const llmPolicy = llmId ? this.llmAccessPolicies?.getAccessPolicy(llmId) : undefined;
    return canLlmAccessResource(
      llmId,
      'mcp',
      serverName,
      llmPolicy,
      allowedLlms,
      this.catalog.getLlmAccessDefault(),
    );
  }

  /** Performs the assert llm access operation. */
  private assertLlmAccess(llmId: string | undefined, serverName: string): void {
    const pkg = this.catalog.getInstalledPackages('mcp').find((entry) => entry.name === serverName);
    const allowedLlms = pkg?.allowedLlms;
    if (!this.isLlmAllowed(llmId, serverName, allowedLlms)) {
      throw new Error(`MCP server "${serverName}" is not installed or has no MCP config.`);
    }
  }
}
