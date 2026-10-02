import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDefaultManifest } from '../../src/agent/catalog/manifest/defaults.ts';
import { manifestHasDirectorySkills } from '../../src/agent/catalog/lock/schema/manifest.has.directory.skills.ts';
import type { SourcesManifest } from '../../src/agent/catalog/types/manifest/sources.manifest.ts';
import { assertLockfileVersionCompatible } from '../../src/cli/commands/assert.lockfile.version.compatible.ts';

const withSkillPath = (skillPath?: string): SourcesManifest => ({
  ...createDefaultManifest(),
  skills: skillPath === undefined ? {} : { demo: { version: '*', source: 'hub', path: skillPath } },
});

describe('manifestHasDirectorySkills', () => {
  it('is true for a skill folder path', () => {
    assert.equal(manifestHasDirectorySkills(withSkillPath('skills/demo')), true);
  });

  it('is false for older single-file skills or no skills', () => {
    assert.equal(manifestHasDirectorySkills(withSkillPath('skills/demo/SKILL.md')), false);
    assert.equal(manifestHasDirectorySkills(withSkillPath()), false);
  });
});

describe('assertLockfileVersionCompatible', () => {
  it('accepts lockfile version 3 and rejects newer ones', () => {
    assert.doesNotThrow(() => assertLockfileVersionCompatible(3));
    assert.throws(() => assertLockfileVersionCompatible(4));
  });
});
