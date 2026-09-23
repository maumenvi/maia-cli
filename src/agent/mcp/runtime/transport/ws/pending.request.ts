










/** Describes the pending request contract. */
export interface PendingRequest {
  /** Performs the resolve operation. */
  resolve(value: unknown): void;
  /** Performs the reject operation. */
  reject(error: unknown): void;
  timer?: NodeJS.Timeout;
}
