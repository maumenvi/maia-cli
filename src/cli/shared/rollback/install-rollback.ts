import type { RollbackStep } from './rollback-step.ts';

/**
 * Runs `steps` in order. If any step's `run()` throws, every already
 * completed step's `undo()` is called in reverse order (most recent
 * first), then the original error is rethrown unchanged — no install or
 * remove operation is left with a partially applied state (FR-008). A
 * failing `undo()` is logged but does not prevent the remaining undos from
 * running; the error ultimately rethrown is always the one that caused the
 * rollback, never an error from an `undo()`.
 */
export async function withRollback<T>(steps: RollbackStep<T>[]): Promise<T[]> {
  const results: T[] = [];
  const completed: RollbackStep<T>[] = [];

  try {
    for (const step of steps) {
      results.push(await step.run());
      completed.push(step);
    }
    return results;
  } catch (error) {
    for (const step of completed.reverse()) {
      try {
        await step.undo();
      } catch (undoError) {
        console.error('Rollback step failed while undoing a partially completed operation:', undoError);
      }
    }
    throw error;
  }
}
