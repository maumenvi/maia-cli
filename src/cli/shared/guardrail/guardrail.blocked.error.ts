/** Raised when a guardrail blocks a destructive action. */
export class GuardrailBlockedError extends Error {
  readonly exitCode: number;

  /** Creates a blocked-action error carrying the CLI exit code to use. */
  constructor(message: string, exitCode: number) {
    super(message);
    this.name = 'GuardrailBlockedError';
    this.exitCode = exitCode;
  }
}
