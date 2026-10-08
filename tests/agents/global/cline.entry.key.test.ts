import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { describe, it } from 'node:test';

import { clineEntryKey } from '../../../src/agent/agents/global/cline.entry.key.ts';

describe('clineEntryKey', () => {
  it('uses a readable project slug and an eight-character hash of the absolute root', () => {
    const root = path.resolve('/tmp/My Maia Project');
    const hash = createHash('sha256').update(root).digest('hex').slice(0, 8);
    assert.equal(clineEntryKey(root), `maia-my-maia-project-${hash}`);
  });

  it('creates different keys for projects with the same folder name at different paths', () => {
    assert.notEqual(clineEntryKey('/one/project'), clineEntryKey('/two/project'));
  });
});
