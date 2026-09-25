import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SPECKIT_TOOLKIT } from '../../src/agent/toolkits/catalog/speckit.ts';
import { buildToolkitInstallCommands } from '../../src/agent/toolkits/plan/build.toolkit.install.commands.ts';
import { classifyToolkitState } from '../../src/agent/toolkits/plan/classify.toolkit.state.ts';
import { collectToolkitPathPatterns } from '../../src/agent/toolkits/plan/collect.toolkit.path.patterns.ts';
import { resolveEffectiveScope } from '../../src/agent/toolkits/plan/resolve.effective.scope.ts';
import { resolveToolkitIntegrations } from '../../src/agent/toolkits/plan/resolve.toolkit.integrations.ts';

describe('resolveEffectiveScope', () => {
  it('keeps project scope without -g and honors -g when supported', () => {
    assert.deepEqual(resolveEffectiveScope(SPECKIT_TOOLKIT, false), { scope: 'project' });
    assert.deepEqual(resolveEffectiveScope(SPECKIT_TOOLKIT, true), { scope: 'global' });
  });

  it('ignores -g with a warning when the toolkit has no global mode', () => {
    assert.deepEqual(resolveEffectiveScope({ ...SPECKIT_TOOLKIT, name: 'fake', supportsGlobal: false }, true), {
      scope: 'project',
      warning: 'fake does not support global installation; installing in the project',
    });
  });
});

describe('resolveToolkitIntegrations', () => {
  it('skips an unsafe integration when a safe one exists', () => {
    assert.deepEqual(resolveToolkitIntegrations(SPECKIT_TOOLKIT, ['claude', 'copilot']), {
      integrations: ['claude'],
      warnings: ['integration "copilot" cannot be combined with other integrations; skipped'],
    });
  });

  it('keeps only the first unsafe integration when no safe one exists', () => {
    assert.deepEqual(resolveToolkitIntegrations(SPECKIT_TOOLKIT, ['copilot', 'zed']), {
      integrations: ['copilot'],
      warnings: ['integration "zed" cannot be combined with other integrations; skipped'],
    });
  });

  it('combines every safe integration in manifest order', () => {
    assert.deepEqual(
      resolveToolkitIntegrations(SPECKIT_TOOLKIT, ['cursor', 'claude', 'codex']).integrations,
      ['cursor-agent', 'claude', 'codex'],
    );
  });

  it('warns about unsupported agents and about having no agent', () => {
    assert.deepEqual(resolveToolkitIntegrations(SPECKIT_TOOLKIT, ['continue']), {
      integrations: [],
      warnings: ['agent "continue" is not supported by speckit'],
    });
    assert.deepEqual(resolveToolkitIntegrations(SPECKIT_TOOLKIT, []).warnings, [
      'no agent configured; speckit installed with its default integration',
    ]);
  });
});

describe('collectToolkitPathPatterns', () => {
  it('joins base and integration paths without duplicates', () => {
    assert.deepEqual(collectToolkitPathPatterns(SPECKIT_TOOLKIT, ['codex', 'zed', 'claude']), [
      '.specify',
      '.agents/skills/speckit-*',
      '.claude/skills/speckit-*',
    ]);
  });
});

describe('buildToolkitInstallCommands', () => {
  const base = {
    version: '1.0.11',
    integrations: ['claude', 'codex'],
    platform: 'linux' as const,
    repository: SPECKIT_TOOLKIT.repository,
  };

  it('initializes the project and adds the extra integrations', () => {
    const commands = buildToolkitInstallCommands(SPECKIT_TOOLKIT, { ...base, scope: 'project' });
    assert.deepEqual(commands.map((command) => command.args.slice(3, 5)), [['init', '--here'], ['integration', 'install']]);
    assert.equal(commands[0].args.at(-1), 'claude');
  });

  it('installs the global tool first unless it is already ready', () => {
    const global = buildToolkitInstallCommands(SPECKIT_TOOLKIT, { ...base, scope: 'global' });
    assert.deepEqual(global.map((command) => command.command), ['uv', 'specify', 'specify']);
    const ready = buildToolkitInstallCommands(SPECKIT_TOOLKIT, { ...base, scope: 'global', globalToolReady: true });
    assert.deepEqual(ready.map((command) => command.command), ['specify', 'specify']);
  });

  it('only installs the global tool when that is what is missing', () => {
    const commands = buildToolkitInstallCommands(SPECKIT_TOOLKIT, { ...base, scope: 'global' }, 'global-tool-missing');
    assert.deepEqual(commands.map((command) => command.command), ['uv']);
  });
});

describe('classifyToolkitState', () => {
  const input = { expectedVersion: '1.0.11', scope: 'project' as const, globalToolVersion: null };

  it('classifies absent, mismatch and installed', () => {
    assert.equal(classifyToolkitState({ ...input, projectVersion: null }), 'absent');
    assert.equal(classifyToolkitState({ ...input, projectVersion: '1.0.10' }), 'mismatch');
    assert.equal(classifyToolkitState({ ...input, projectVersion: '1.0.11.dev0' }), 'installed');
  });

  it('reports a missing global tool only when the project is fine', () => {
    const global = { ...input, scope: 'global' as const, projectVersion: '1.0.11' };
    assert.equal(classifyToolkitState({ ...global, globalToolVersion: null }), 'global-tool-missing');
    assert.equal(classifyToolkitState({ ...global, globalToolVersion: '1.0.10' }), 'global-tool-missing');
    assert.equal(classifyToolkitState({ ...global, globalToolVersion: 'specify 1.0.11'.split(' ')[1] }), 'installed');
  });
});
