/** A single reportable reason why a destructive action was blocked. */
export interface GuardrailViolation {
  pattern: string;
  targetPath: string;
  message: string;
}
