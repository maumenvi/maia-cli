import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { withRollback } from '../../src/cli/shared/rollback/install-rollback.ts';

describe('withRollback', () => {
  it('returns results in order and calls no undo when all steps succeed', async () => {
    const undosCalled: string[] = [];
    const results = await withRollback([
      { run: () => 'a', undo: () => { undosCalled.push('undo-a'); } },
      { run: () => 'b', undo: () => { undosCalled.push('undo-b'); } },
    ]);

    assert.deepEqual(results, ['a', 'b']);
    assert.deepEqual(undosCalled, []);
  });

  it('undoes completed steps in reverse order and rethrows the original error when a step fails', async () => {
    const order: string[] = [];
    const originalError = new Error('boom');
    (originalError as NodeJS.ErrnoException).code = 'EBOOM';

    await assert.rejects(
      () => withRollback([
        { run: () => { order.push('run-1'); return 1; }, undo: () => { order.push('undo-1'); } },
        { run: () => { order.push('run-2'); return 2; }, undo: () => { order.push('undo-2'); } },
        {
          run: () => { order.push('run-3'); throw originalError; },
          undo: () => { order.push('undo-3'); },
        },
      ]),
      (error: NodeJS.ErrnoException) => {
        assert.equal(error, originalError);
        assert.equal(error.code, 'EBOOM');
        return true;
      },
    );

    assert.deepEqual(order, ['run-1', 'run-2', 'run-3', 'undo-2', 'undo-1']);
  });

  it('continues undoing remaining steps even when one undo itself throws, and still rethrows the original error', async () => {
    const order: string[] = [];
    const originalError = new Error('original failure');
    const originalConsoleError = console.error;
    const loggedErrors: unknown[] = [];
    console.error = (...args: unknown[]) => { loggedErrors.push(args); };

    try {
      await assert.rejects(
        () => withRollback([
          { run: () => { order.push('run-1'); return 1; }, undo: () => { order.push('undo-1'); } },
          {
            run: () => { order.push('run-2'); return 2; },
            undo: () => { order.push('undo-2-attempt'); throw new Error('undo failed'); },
          },
          {
            run: () => { order.push('run-3'); throw originalError; },
            undo: () => { order.push('undo-3'); },
          },
        ]),
        (error: Error) => error === originalError,
      );

      assert.deepEqual(order, ['run-1', 'run-2', 'run-3', 'undo-2-attempt', 'undo-1']);
      assert.equal(loggedErrors.length, 1);
    } finally {
      console.error = originalConsoleError;
    }
  });
});
