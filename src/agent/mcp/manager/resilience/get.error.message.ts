










/** Performs the get error message operation. */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
