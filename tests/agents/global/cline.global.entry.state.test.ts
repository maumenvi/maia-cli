import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { inspectClineGlobalEntry } from '../../../src/agent/agents/global/inspect.cline.global.entry.ts';
import { removeClineGlobalEntry } from '../../../src/agent/agents/global/remove.cline.global.entry.ts';
import { upsertClineGlobalEntry } from '../../../src/agent/agents/global/upsert.cline.global.entry.ts';

const currentEntry = {
  command: 'maia',
  args: ['mcp-server', '--agent', 'cline'],
  env: { MAIA_PROJECT_DIR: '/workspace/current' },
};

describe('Cline global entry helpers', () => {
  it('recognizes a current project registration and returns orphaned Maia entries', () => {
    const state = inspectClineGlobalEntry(
      {
        mcpServers: {
          current: currentEntry,
          stale: { command: 'maia', args: ['mcp-server', '--agent', 'cline'], env: { MAIA_PROJECT_DIR: '/gone' } },
          other: { command: 'other', args: [] },
        },
      },
      '/settings/cline.json',
      'current',
      currentEntry,
      (project) => project === '/workspace/current',
    );
    assert.deepEqual(state, { path: '/settings/cline.json', current: true, stale: ['stale'] });
  });

  it('updates only Maia-owned fields and preserves Cline-added fields and other servers', () => {
    const current = {
      mcpServers: {
        maia: {
          command: 'old',
          args: ['old'],
          env: { MAIA_PROJECT_DIR: '/old', CUSTOM: 'keep' },
          disabled: true,
          autoApprove: ['tool'],
        },
        other: { command: 'other' },
      },
      otherSetting: true,
    };
    assert.deepEqual(
      upsertClineGlobalEntry(current, 'maia', currentEntry),
      {
        mcpServers: {
          maia: {
            command: 'maia',
            args: ['mcp-server', '--agent', 'cline'],
            env: { MAIA_PROJECT_DIR: '/workspace/current', CUSTOM: 'keep' },
            disabled: true,
            autoApprove: ['tool'],
          },
          other: { command: 'other' },
        },
        otherSetting: true,
      },
    );
  });

  it('removes only the requested project entry', () => {
    assert.deepEqual(
      removeClineGlobalEntry({ mcpServers: { maia: currentEntry, other: { command: 'other' } } }, 'maia'),
      { mcpServers: { other: { command: 'other' } } },
    );
  });
});
