import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { renderContinueMcpBlock } from '../../../src/agent/agents/inject/render.continue.mcp.block.ts';

describe('renderContinueMcpBlock', () => {
  it('quotes and escapes proxy command and argument values as YAML strings', () => {
    assert.equal(
      renderContinueMcpBlock({
        key: 'maia',
        config: { command: 'tool"exe', args: ['line\nbreak', 'next'] },
      }),
      [
        'name: Maia',
        'version: 0.0.1',
        'schema: v1',
        'mcpServers:',
        '  - name: maia',
        '    type: stdio',
        '    command: "tool\\"exe"',
        '    args:',
        '      - "line\\nbreak"',
        '      - "next"',
        '',
      ].join('\n'),
    );
  });
});
