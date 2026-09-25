const AFFIRMATIVE_ANSWERS = new Set(['y', 'yes', 's', 'sim']);

/** Returns whether a typed answer means "yes"; anything else, including empty, is "no". */
export function isAffirmativeAnswer(answer: string): boolean {
  return AFFIRMATIVE_ANSWERS.has(answer.trim().toLowerCase());
}
