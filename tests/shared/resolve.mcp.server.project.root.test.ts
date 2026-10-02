import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveMcpServerProjectRoot } from '../../src/config/core/resolve.mcp.server.project.root.ts';

const find = (startDir: string) => (startDir.startsWith('/project') ? '/project' : undefined);

describe('resolveMcpServerProjectRoot', () => {
  it('prefers the project directory the agent exports', () => {
    assert.equal(resolveMcpServerProjectRoot({ env: { CLAUDE_PROJECT_DIR: '/project' }, cwd: '/elsewhere', find }), '/project');
  });

  it('falls back to the working directory when the variable is not a project', () => {
    assert.equal(resolveMcpServerProjectRoot({ env: { CLAUDE_PROJECT_DIR: '/tmp' }, cwd: '/project/sub', find }), '/project');
  });

  it('is undefined outside any project', () => {
    assert.equal(resolveMcpServerProjectRoot({ env: {}, cwd: '/elsewhere', find }), undefined);
  });
});
