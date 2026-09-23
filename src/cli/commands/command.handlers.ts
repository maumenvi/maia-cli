import type { CommandHandler } from '../contracts/command.handler.ts';
import { agentCommand } from './agent/agent.command.ts';
import { ciCommand } from './ci.ts';
import { contextCommand } from './context.ts';
import { guardrailCommand } from './guardrail.ts';
import { helpCommand } from './help.ts';
import { initCommand } from './init/init.command.ts';
import { installCommand } from './install/install.command.ts';
import { listCapabilitiesCommand } from './list-capabilities/list.capabilities.command.ts';
import { listSkillsCommand } from './list-skills/list.skills.command.ts';
import { listToolsCommand } from './list-tools/list.tools.command.ts';
import { listCommand } from './list.ts';
import { lockCommand } from './lock.ts';
import { mcpServerCommand } from './mcp.server.ts';
import { mcpCommand } from './mcp/mcp.command.ts';
import { removeCommand } from './remove.ts';
import { skillsCommand } from './skills/skills.command.ts';
import { sourceCommand } from './source.ts';
import { verifyCommand } from './verify.ts';
import { versionCommand } from './version/version.command.ts';

export const commandHandlers: Record<string, CommandHandler> = {
  add: agentCommand,
  agent: agentCommand,
  init: initCommand,
  i: installCommand,
  install: installCommand,
  rm: removeCommand,
  remove: removeCommand,
  ls: listCommand,
  'list-skills': listSkillsCommand,
  'list-tools': listToolsCommand,
  'list-capabilities': listCapabilitiesCommand,
  capabilities: listCapabilitiesCommand,
  discover: listToolsCommand,
  lock: lockCommand,
  up: lockCommand,
  ci: ciCommand,
  guardrail: guardrailCommand,
  verify: verifyCommand,
  context: contextCommand,
  mcp: mcpCommand,
  'mcp-server': mcpServerCommand,
  source: sourceCommand,
  skills: skillsCommand,
  version: versionCommand,
  '--version': versionCommand,
  '-v': versionCommand,
  help: helpCommand,
};
