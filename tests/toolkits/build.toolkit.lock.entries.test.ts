import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SPECKIT_TOOLKIT } from '../../src/agent/toolkits/catalog/speckit.ts';
import { buildToolkitLockEntries } from '../../src/agent/toolkits/lock/build.toolkit.lock.entries.ts';
import { toToolkitView } from '../../src/agent/toolkits/view/to.toolkit.view.ts';

describe('buildToolkitLockEntries', () => {
  it('derives the lock entry from the manifest and agents', () => {
    assert.deepEqual(buildToolkitLockEntries({ speckit: { version: '1.0.11', scope: 'global' } }, ['claude', 'copilot']), {
      speckit: {
        name: 'speckit',
        version: '1.0.11',
        scope: 'global',
        source: 'https://github.com/github/spec-kit',
        ref: 'v1.0.11',
        integrations: ['claude'],
        paths: ['.specify', '.claude/skills/speckit-*'],
      },
    });
  });

  it('rejects toolkits outside the built-in catalog', () => {
    assert.throws(
      () => buildToolkitLockEntries({ nope: { version: '1.0.0', scope: 'project' } }, []),
      /Unknown toolkit "nope" in maia.json \(not in Maia's built-in catalog\)/,
    );
  });

  it('rejects global scope for a toolkit without global support and invalid versions', () => {
    const catalog = [{ ...SPECKIT_TOOLKIT, supportsGlobal: false }];
    assert.throws(
      () => buildToolkitLockEntries({ speckit: { version: '1.0.11', scope: 'global' } }, [], catalog),
      /does not support global scope/,
    );
    assert.throws(() => buildToolkitLockEntries({ speckit: { version: 'latest', scope: 'project' } }, []), /Invalid version/);
  });
});

describe('toToolkitView', () => {
  it('describes an available toolkit and an installed one', () => {
    const available = toToolkitView(SPECKIT_TOOLKIT);
    assert.equal(available.installed, false);
    assert.equal(available.version, undefined);
    assert.equal(available.installCommand, 'maia toolkit i speckit');

    const [entry] = Object.values(buildToolkitLockEntries({ speckit: { version: '1.0.11', scope: 'project' } }, ['claude']));
    const installed = toToolkitView(SPECKIT_TOOLKIT, entry);
    assert.equal(installed.installed, true);
    assert.equal(installed.version, '1.0.11');
    assert.deepEqual(installed.paths, ['.specify', '.claude/skills/speckit-*']);
  });
});
