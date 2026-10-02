import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { hashSkillFiles } from '../../src/agent/catalog/lock/hash.skill.files.ts';
import { readSkillDirectory } from '../../src/agent/catalog/lock/read.skill.directory.ts';

const files = [
  { path: 'SKILL.md', content: Buffer.from('# skill') },
  { path: 'references/a.md', content: Buffer.from('a') },
];

describe('hashSkillFiles', () => {
  it('does not depend on input order', () => {
    assert.deepEqual(hashSkillFiles(files), hashSkillFiles([...files].reverse()));
  });

  it('changes the file hash and the artifact hash when one byte changes', () => {
    const before = hashSkillFiles(files);
    const after = hashSkillFiles([files[0], { path: 'references/a.md', content: Buffer.from('b') }]);
    assert.notEqual(before.files['references/a.md'], after.files['references/a.md']);
    assert.equal(before.files['SKILL.md'], after.files['SKILL.md']);
    assert.notEqual(before.artifactHash, after.artifactHash);
  });

  it('matches what is read back from disk', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'maia-hash-skill-'));
    try {
      mkdirSync(path.join(dir, 'references'));
      writeFileSync(path.join(dir, 'SKILL.md'), '# skill');
      writeFileSync(path.join(dir, 'references', 'a.md'), 'a');
      assert.deepEqual(hashSkillFiles(readSkillDirectory(dir)), hashSkillFiles(files));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
