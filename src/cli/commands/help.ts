import type { CommandHandler } from '../contracts/command.handler.ts';

/** Performs the help command operation. */
export const helpCommand: CommandHandler = async () => {
  const lines = [
    'maia agent add <name...>',
    'maia add agent <name...>',
    'maia add <name...>',
    'maia agent ls',
    'maia init [agent...]',
    'maia i',
    'maia i|install <skill|mcp|tool> <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]',
    'maia rm|remove <skill|mcp|tool> <name>',
    'maia ls [skill|mcp|tool]',
    'maia list-skills [query] [--json]',
    'maia list-tools [query] [--json]',
    'maia list-capabilities [query] [--json]',
    'maia capabilities [query] [--json]',
    'maia discover [query] [--json]',
    'maia lock',
    'maia ci',
    'maia verify',
    'maia guardrail check <path...>',
    'maia source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]',
    'maia source ls',
    'maia skills find <query>',
    'maia skills add <skill-name|owner/repo@skill>',
    'maia context build',
    'maia context show --for dev|llm',
    'maia mcp find <query>',
    'maia mcp add <name>',
    'maia mcp sync',
    'maia mcp-server [--name <name>] [--version <ver>] [--dynamic true]',
    'maia version',
  ];
  console.log(lines.join('\n'));
};
