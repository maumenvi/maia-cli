







/** Performs the is missing skill in source error operation. */
export function isMissingSkillInSourceError(error: unknown): boolean {
  return error instanceof Error && /was not found in/i.test(error.message);
}
