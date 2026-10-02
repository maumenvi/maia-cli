import type { CliInteraction } from '../../src/cli/contracts/cli.interaction.ts';

/** A scripted terminal: never touches the real TTY and records what it was asked. */
export function fakeInteraction(options: {
  interactive?: boolean;
  confirm?: boolean;
  choose?: number;
} = {}): CliInteraction & { questions: string[] } {
  const questions: string[] = [];
  return {
    questions,
    isInteractive: () => options.interactive ?? false,
    select: async (results) => {
      const index = options.choose ?? 0;
      return index > 0 ? results[index - 1] ?? null : null;
    },
    confirm: async (question) => {
      questions.push(question);
      return options.confirm ?? false;
    },
  };
}
