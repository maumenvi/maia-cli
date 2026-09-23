/**
 * A single step of a rollback-protected sequence (see `withRollback`).
 * `run` performs the action; `undo` reverses specifically what that `run`
 * did, independently of any other step's state.
 */
export interface RollbackStep<T> {
  run: () => T | Promise<T>;
  undo: () => void | Promise<void>;
}
