import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DestructiveAction } from '../../src/guardrails/contracts/destructive.action.ts';
import { evaluateGuardrail } from '../../src/guardrails/policy/evaluate.guardrail.ts';

const WORKSPACE = '/workspace';

function action(targetPath: string, kind: DestructiveAction['kind'] = 'file-delete'): DestructiveAction {
  return { kind, targetPath };
}

describe('evaluateGuardrail', () => {
  it('allows a path that matches no deny pattern', () => {
    const decision = evaluateGuardrail(action('src/cli/index.ts'), {
      config: { version: 1, denyPatterns: ['**/*.env'] },
      workspaceRoot: WORKSPACE,
    });

    assert.equal(decision.outcome, 'allow');
  });

  it('blocks a path that matches a deny pattern', () => {
    const decision = evaluateGuardrail(action('build/output.bin'), {
      config: { version: 1, denyPatterns: ['build/**'] },
      workspaceRoot: WORKSPACE,
    });

    assert.equal(decision.outcome, 'block');
    if (decision.outcome !== 'block') throw new Error('expected block');
    assert.equal(decision.violations.length, 1);
    assert.equal(decision.violations[0]?.pattern, 'build/**');
  });

  it('blocks a path matched only by a built-in default pattern', () => {
    const decision = evaluateGuardrail(action('.maia/mcp.env'), {
      config: { version: 1, denyPatterns: [] },
      workspaceRoot: WORKSPACE,
    });

    assert.equal(decision.outcome, 'block');
    if (decision.outcome !== 'block') throw new Error('expected block');
    assert.equal(decision.violations[0]?.pattern, '**/*.env');
  });

  it('keeps the built-in defaults even when a config declares its own patterns', () => {
    const decision = evaluateGuardrail(action('.maia/mcp.env'), {
      config: { version: 1, denyPatterns: ['build/**'] },
      workspaceRoot: WORKSPACE,
    });

    assert.equal(decision.outcome, 'block', 'a config must not loosen the baseline');
  });

  it('aggregates every matching pattern instead of stopping at the first', () => {
    const decision = evaluateGuardrail(action('app/build/output.bin'), {
      config: { version: 1, denyPatterns: ['app/**', 'build/**', '**/output.bin'] },
      workspaceRoot: WORKSPACE,
    });

    assert.equal(decision.outcome, 'block');
    if (decision.outcome !== 'block') throw new Error('expected block');
    assert.equal(decision.violations.length, 2, 'app/** and **/output.bin both match');
    assert.deepEqual(
      decision.violations.map((violation) => violation.pattern).sort(),
      ['**/output.bin', 'app/**'],
    );
  });

  it('blocks a path resolving outside the workspace root', () => {
    const decision = evaluateGuardrail(action('../../etc/passwd'), {
      config: { version: 1, denyPatterns: [] },
      workspaceRoot: WORKSPACE,
    });

    assert.equal(decision.outcome, 'block');
  });

  it('blocks an absolute path outside the workspace root', () => {
    const decision = evaluateGuardrail(action('/etc/passwd'), {
      config: { version: 1, denyPatterns: [] },
      workspaceRoot: WORKSPACE,
    });

    assert.equal(decision.outcome, 'block');
  });

  it('blocks everything when the config is malformed (fail-closed)', () => {
    const decision = evaluateGuardrail(action('any-file.txt'), {
      malformed: true,
      workspaceRoot: WORKSPACE,
    });

    assert.equal(decision.outcome, 'block');
    if (decision.outcome !== 'block') throw new Error('expected block');
    assert.equal(decision.violations[0]?.pattern, '<malformed-config>');
  });

  it('gives the same verdict for the same path regardless of kind (FR-010)', () => {
    const options = { config: { version: 1, denyPatterns: ['**/*.env'] }, workspaceRoot: WORKSPACE };
    const asDelete = evaluateGuardrail(action('.maia/mcp.env', 'file-delete'), options);
    const asOverwrite = evaluateGuardrail(action('.maia/mcp.env', 'file-overwrite'), options);

    assert.equal(asDelete.outcome, asOverwrite.outcome);
    assert.equal(asDelete.outcome, 'block');
  });

  it('produces an audit note for an allowed action', () => {
    const decision = evaluateGuardrail(action('src/cli/index.ts'), {
      config: { version: 1, denyPatterns: [] },
      workspaceRoot: WORKSPACE,
    });

    assert.equal(decision.outcome, 'allow');
    if (decision.outcome !== 'allow') throw new Error('expected allow');
    assert.ok(decision.auditNote.length > 0);
  });
});
