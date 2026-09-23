/**
 * Deny patterns that apply when a project declares no guardrail config.
 *
 * The MCP credentials file is not listed separately: it already matches the
 * env-file pattern below. A project config adds to these patterns and never
 * replaces them, so the baseline cannot be loosened by configuration.
 */
export const DEFAULT_DENY_PATTERNS: readonly string[] = [
  '**/*.env',
  '**/credentials/**',
];
