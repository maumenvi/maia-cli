import type { AgentConfigFormat } from '../inject/agent.config.format.ts';
import type { MCPConfig } from '../../tools/contracts/mcp.config.ts';

/** Describes the agent target contract. */
export interface AgentTarget {
  /** Short id used in CLI: "claude", "copilot", etc. */
  id: string;
  /** Additional accepted names in CLI, e.g. "vscode" -> "copilot". */
  aliases?: string[];
  /** Human-readable display name */
  name: string;
  /** Schema the target's MCP config file uses. */
  configFormat: AgentConfigFormat;
  /**
   * MCP transports this agent's native format can represent. Omitted means
   * permissive — every transport is assumed supported (the case for every
   * agent today). Declared only when an agent genuinely cannot represent
   * some transport, so install can skip syncing that agent for that MCP
   * with an explicit warning instead of writing an unusable config.
   */
  supportedTransports?: readonly NonNullable<MCPConfig['transport']>[];
  /**
   * Resolve the absolute path(s) where this agent's MCP config lives.
   * Returns multiple candidates; the first existing one is used,
   * or the first candidate is created when none exist.
   */
  configPaths(cwd: string): string[];
  /**
   * Config files older Maia versions wrote for this agent. They are never a
   * destination: Maia only moves its own `maia` entry out of them.
   */
  legacyConfigPaths?(cwd: string): string[];
  /**
   * How the proxy entry tells the agent where the project is, without ever
   * writing a machine path into a project file: `'workspace-variable'` uses
   * `${workspaceFolder}` (expanded by the agent); `'omit'` leaves `cwd` out
   * because the agent already starts servers inside the project.
   */
  projectDir: 'omit' | 'workspace-variable';
  /** Built-in slash commands of the agent, used to warn about skill name clashes. */
  nativeCommands?: readonly string[];
  /**
   * Absolute path to the agent's native skills directory, when the agent
   * supports first-class skills. Each skill is copied here as its whole folder.
   */
  skillsDir?(cwd: string): string;
  /**
   * Absolute path to the instruction/guidance file the agent reads by default.
   * Maia upserts an idempotent capability block into this file.
   */
  instructionsFile?(cwd: string): string;
}
