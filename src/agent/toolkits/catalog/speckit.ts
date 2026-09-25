import type { ToolkitDefinition } from '../contracts/toolkit.definition.ts';
import { SPECKIT_COMMANDS } from './speckit.command.builder.ts';

/**
 * GitHub Spec Kit. Integration keys, multi-install safety and paths were
 * verified against Spec Kit v1.0.11 (research D3, "Caminhos verificados").
 */
export const SPECKIT_TOOLKIT: ToolkitDefinition = {
  name: 'speckit',
  title: 'GitHub Spec Kit',
  description: 'Spec-driven development: specify → plan → tasks → implement',
  docsUrl: 'https://github.github.com/spec-kit/installation.html',
  repository: 'https://github.com/github/spec-kit',
  supportsGlobal: true,
  prerequisites: [
    { command: 'uv', args: ['--version'], hint: 'Install uv: https://docs.astral.sh/uv/.' },
    { command: 'git', args: ['--version'], hint: 'Install Git: https://git-scm.com/downloads.' },
  ],
  integrations: {
    claude: { key: 'claude', multiInstallSafe: true },
    copilot: { key: 'copilot', multiInstallSafe: false },
    cursor: { key: 'cursor-agent', multiInstallSafe: true },
    zed: { key: 'zed', multiInstallSafe: false },
    cline: { key: 'cline', multiInstallSafe: true },
    codex: { key: 'codex', multiInstallSafe: true },
  },
  projectPaths: ['.specify'],
  integrationPaths: {
    claude: ['.claude/skills/speckit-*'],
    copilot: ['.github/skills/speckit-*'],
    'cursor-agent': ['.cursor/skills/speckit-*'],
    codex: ['.agents/skills/speckit-*'],
    zed: ['.agents/skills/speckit-*'],
    cline: ['.clinerules/workflows/speckit-*'],
  },
  commands: SPECKIT_COMMANDS,
  parseGlobalToolVersion: (stdout) => /specify\s+(\S+)/.exec(stdout)?.[1] ?? null,
  projectVersionFile: '.specify/init-options.json',
  parseProjectVersion: (content) => {
    try {
      const parsed = JSON.parse(content) as { speckit_version?: unknown };
      return typeof parsed.speckit_version === 'string' ? parsed.speckit_version : null;
    } catch {
      return null;
    }
  },
};
