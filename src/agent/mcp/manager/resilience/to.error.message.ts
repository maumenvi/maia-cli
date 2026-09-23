import { getErrorMessage } from './get.error.message.ts';

/** Performs the to error message operation. */
export function toErrorMessage(error: unknown): string {
  return getErrorMessage(error);
}
