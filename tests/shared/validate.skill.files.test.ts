import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateSkillFiles } from '../../src/cli/shared/remote-skill/validate.skill.files.ts';

const file = (p: string, size = 1) => ({ path: p, content: Buffer.alloc(size, 'a') });
const URL = 'https://github.com/acme/skills.git';

describe('validateSkillFiles', () => {
  it('returns a valid folder sorted by path', () => {
    const result = validateSkillFiles('x', [file('scripts/b.sh'), file('SKILL.md'), file('references/a.md')], URL);
    assert.deepEqual(result.map((entry) => entry.path), ['references/a.md', 'scripts/b.sh', 'SKILL.md'].sort((a, b) => a.localeCompare(b)));
  });

  for (const unsafe of ['/etc/passwd', '../escape.md', 'a/../../b', 'a\\b', 'C:/x', '', 'a//b']) {
    it(`rejects the unsafe path "${unsafe}"`, () => {
      assert.throws(() => validateSkillFiles('x', [file('SKILL.md'), file(unsafe)], URL), /contains an unsafe path/);
    });
  }

  it('requires SKILL.md', () => {
    assert.throws(() => validateSkillFiles('x', [file('README.md')], URL), /Skill "x" was not found in https:\/\/github.com\/acme\/skills.git/);
  });

  it('enforces the file count and size limits', () => {
    const many = [file('SKILL.md'), ...Array.from({ length: 200 }, (_, i) => file(`f${i}.md`))];
    assert.throws(() => validateSkillFiles('x', many, URL), /exceeds the size limit \(201 files/);
    assert.throws(() => validateSkillFiles('x', [file('SKILL.md', 6 * 1024 * 1024)], URL), /exceeds the size limit \(1 files, 6\.0 MB\)/);
  });
});
