import type { CommandHandler } from '../contracts/command-handler.ts';
import { assertPathAllowed } from '../shared/guardrail/assert.path.allowed.ts';

/**
 * Performs the guardrail command operation.
 *
 * `maia guardrail check <path...>` is the on-demand enforcement point of
 * FR-008; the pre-commit hook, CI and `maia remove` reach the same policy
 * through `assertPathAllowed`.
 */
export const guardrailCommand: CommandHandler = async (args, { store }) => {
  const action = args[0];
  if (action !== 'check') {
    throw new Error('Usage: maia guardrail check <path...>');
  }

  const targets = args.slice(1);
  if (targets.length === 0) {
    throw new Error('Usage: maia guardrail check <path...>');
  }

  const { projectRoot } = store.getPaths();
  for (const target of targets) {
    assertPathAllowed(projectRoot, projectRoot, target, 'file-overwrite', 'maia guardrail check');
  }

  console.log(`Guardrail OK for ${targets.length} path(s)`);
};
