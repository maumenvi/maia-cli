/** Shortest injected value worth redacting; below this, matches hit unrelated text. */
const MINIMUM_REDACTABLE_LENGTH = 8;

/**
 * Replaces injected credential values with their variable name.
 *
 * MCP servers in debug mode commonly echo their effective configuration, which
 * would print a credential to the user's terminal through Maia (SC-003). Since
 * Maia chose the values it injected, the match is exact rather than heuristic.
 *
 * Values shorter than 8 characters are left alone: short substrings would match
 * unrelated text and destroy the log's usefulness. A value the server transforms
 * before printing (base64, hashing) is not caught — literal matching is not a
 * cryptographic barrier, and environment isolation remains the primary control.
 */
export function redactSecretsFromStream(text: string, values: Record<string, string>): string {
  let result = text;
  for (const [name, value] of Object.entries(values)) {
    if (value.length < MINIMUM_REDACTABLE_LENGTH) continue;
    result = result.split(value).join(`[REDACTED:${name}]`);
  }
  return result;
}
