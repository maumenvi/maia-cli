import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SPECKIT_TOOLKIT } from '../../src/agent/toolkits/catalog/speckit.ts';
import type { ToolkitInstallContext } from '../../src/agent/toolkits/contracts/toolkit.install.context.ts';

const SOURCE = 'git+https://github.com/github/spec-kit.git@v1.0.11';
const context = (overrides: Partial<ToolkitInstallContext> = {}): ToolkitInstallContext => ({
  version: '1.0.11',
  scope: 'project',
  integrations: ['claude'],
  platform: 'linux',
  repository: SPECKIT_TOOLKIT.repository,
  ...overrides,
});

describe('SPECKIT_TOOLKIT', () => {
  const { commands } = SPECKIT_TOOLKIT;

  it('initializes a project through an ephemeral uvx environment', () => {
    assert.deepEqual(commands.initProject(context(), 'claude'), {
      command: 'uvx',
      args: ['--from', SOURCE, 'specify', 'init', '--here', '--force', '--non-interactive',
        '--ignore-agent-tools', '--script', 'sh', '--integration', 'claude'],
    });
  });

  it('uses PowerShell scripts on Windows and omits --integration without a primary', () => {
    const command = commands.initProject(context({ platform: 'win32' }));
    assert.equal(command.args[command.args.indexOf('--script') + 1], 'ps');
    assert.equal(command.args.includes('--integration'), false);
  });

  it('installs the global tool with uv and then runs the global specify', () => {
    assert.deepEqual(commands.installGlobalTool(context({ scope: 'global' })), {
      command: 'uv',
      args: ['tool', 'install', 'specify-cli', '--force', '--from', SOURCE],
    });
    assert.equal(commands.initProject(context({ scope: 'global' }), 'claude').command, 'specify');
  });

  it('adds and removes integrations natively', () => {
    assert.deepEqual(commands.addIntegration(context(), 'codex').args.slice(-3), ['integration', 'install', 'codex']);
    assert.deepEqual(commands.removeIntegration(context({ scope: 'global' }), 'codex'), {
      command: 'specify',
      args: ['integration', 'uninstall', 'codex'],
    });
  });

  it('parses the installed versions', () => {
    assert.equal(SPECKIT_TOOLKIT.parseGlobalToolVersion('specify 1.0.11\n'), '1.0.11');
    assert.equal(SPECKIT_TOOLKIT.parseGlobalToolVersion('nope'), null);
    assert.equal(SPECKIT_TOOLKIT.parseProjectVersion('{"speckit_version":"1.0.9.dev0"}'), '1.0.9.dev0');
    assert.equal(SPECKIT_TOOLKIT.parseProjectVersion('not json'), null);
    assert.equal(commands.uninstallGlobalToolHint(), 'uv tool uninstall specify-cli');
  });

  it('maps Maia agents to Spec Kit integrations', () => {
    const map = Object.fromEntries(
      Object.entries(SPECKIT_TOOLKIT.integrations).map(([agent, integration]) => [agent, integration]),
    );
    assert.deepEqual(map, {
      claude: { key: 'claude', multiInstallSafe: true },
      copilot: { key: 'copilot', multiInstallSafe: false },
      cursor: { key: 'cursor-agent', multiInstallSafe: true },
      zed: { key: 'zed', multiInstallSafe: false },
      cline: { key: 'cline', multiInstallSafe: true },
      codex: { key: 'codex', multiInstallSafe: true },
    });
  });
});
