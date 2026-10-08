import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createClineGlobalEntry } from '../../../src/agent/agents/global/cline.global.entry.ts';

describe('createClineGlobalEntry', () => {
  it('pins the Cline MCP server to the selected Maia project', () => {
    assert.deepEqual(createClineGlobalEntry('/workspace/project', 'cline'), {
      command: 'maia',
      args: ['mcp-server', '--agent', 'cline'],
      env: { MAIA_PROJECT_DIR: '/workspace/project' },
    });
  });
});
