import { createInterface } from 'node:readline/promises';

import type { ConfirmFn } from './confirm.fn.ts';
import { isAffirmativeAnswer } from './is.affirmative.answer.ts';

/** Prompts on the terminal; without a TTY the answer is always "no" (research D8). */
export const promptConfirm: ConfirmFn = async (question) => {
  if (!process.stdin.isTTY) {
    return false;
  }
  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return isAffirmativeAnswer(await input.question(`${question} `));
  } finally {
    input.close();
  }
};
