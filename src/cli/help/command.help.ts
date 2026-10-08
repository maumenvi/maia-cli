const AGENT = [
  'maia agent add <name...>',
  'maia agent rm|remove <name...>',
  'maia add agent <name...>',
  'maia add <name...>',
  'maia agent ls',
];
const INSTALL = [
  'maia i',
  'maia i|install <skill|mcp|tool> <name> [--version <range>] [--source <alias>] [--llms <id1,id2>] [--all-llms]',
];
const REMOVE = ['maia rm|remove <skill|mcp|tool> <name>'];
const CAPABILITIES = [
  'maia list-capabilities [query] [--json]',
  'maia capabilities [query] [--json]',
];
const LOCK = ['maia lock'];
const VERSION = ['maia version'];

/**
 * Usage lines per command, keyed by every name the CLI accepts (aliases
 * included). It is the single source for `maia help` and for `--help`/`-h`
 * on any command; key order is the order `maia help` prints.
 */
export const COMMAND_HELP: Readonly<Record<string, readonly string[]>> = {
  agent: AGENT,
  add: AGENT,
  init: ['maia init [agent...]'],
  i: INSTALL,
  install: INSTALL,
  rm: REMOVE,
  remove: REMOVE,
  ls: ['maia ls [skill|mcp|tool]'],
  'list-skills': ['maia list-skills [query] [--json]'],
  'list-tools': ['maia list-tools [query] [--json]'],
  'list-capabilities': CAPABILITIES,
  capabilities: CAPABILITIES,
  discover: ['maia discover [query] [--json]'],
  lock: LOCK,
  up: LOCK,
  ci: ['maia ci'],
  verify: ['maia verify'],
  guardrail: ['maia guardrail check <path...>'],
  source: [
    'maia source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]',
    'maia source ls',
  ],
  toolkit: [
    'maia toolkit i|install <name> [-g|--global] [--version <x.y.z>] [-y|--yes]',
    'maia toolkit ls|list [--json]',
    'maia toolkit rm|remove <name> [-y|--yes]',
  ],
  skills: [
    'maia skills find <query> [--all-llms | --llms <ids>]',
    'maia skills add <skill-name|owner/repo@skill> [--as <name>] [--all-llms | --llms <ids>]',
  ],
  context: [
    'maia context build',
    'maia context show --for dev|llm',
  ],
  mcp: [
    'maia mcp find <query> [--env-g] [--all-llms | --llms <ids>]',
    'maia mcp i|add|install <name> [--env-g] [--all-llms | --llms <ids>]',
    'maia mcp sync',
  ],
  'mcp-server': ['maia mcp-server [--name <name>] [--version <ver>] [--dynamic true]'],
  version: VERSION,
  '--version': VERSION,
  '-v': VERSION,
};
