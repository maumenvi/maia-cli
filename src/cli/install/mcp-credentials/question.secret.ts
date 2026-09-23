import { createInterface } from 'node:readline/promises';

import { SecretPromptOutput } from './secret.prompt.output.ts';

/** Performs the question secret operation. */
export async function questionSecret(
  input: ReturnType<typeof createInterface>,
  output: SecretPromptOutput,
  prompt: string,
): Promise<string> {
  process.stdout.write(prompt);
  output.setMuted(true);
  try {
    return await input.question('');
  } finally {
    output.setMuted(false);
    process.stdout.write('\n');
  }
}
