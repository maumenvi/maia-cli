/** Explains a version mismatch and how to switch explicitly (Clarification 6). */
export function toolkitMismatchMessage(name: string, found: string, source: string, required: string): string {
  return `Toolkit ${name} is at ${found} but ${source} requires ${required}. `
    + `Run "maia toolkit i ${name} --version ${required}" to switch versions.`;
}
