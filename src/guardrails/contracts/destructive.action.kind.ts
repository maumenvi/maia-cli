/**
 * Categories of destructive action the guardrail recognizes.
 *
 * Only two values exist: FR-010 fixed the guardrail decision to the target
 * path, so `config-rewrite` and `command-declared` were dropped for having no
 * producer. The kind feeds the audit trail and never the allow/block verdict.
 */
export type DestructiveActionKind = 'file-delete' | 'file-overwrite';
