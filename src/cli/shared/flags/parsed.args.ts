
/** Describes the parsed args contract. */
export interface ParsedArgs {
  positional: string[];
  flags: Record<string, string>;
}
