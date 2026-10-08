/** Rejects malformed TOML table headers, strings, or inline-table braces. */
export function validateTomlStructure(contents: string, filePath: string): void {
  let braces = 0;
  const lines = contents.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    let quote: '"' | "'" | undefined;
    let escaped = false;
    for (const character of line) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\' && quote === '"') {
        escaped = true;
        continue;
      }
      if (quote) {
        if (character === quote) quote = undefined;
        continue;
      }
      if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '#') {
        break;
      } else if (character === '{') {
        braces += 1;
      } else if (character === '}') {
        braces -= 1;
        if (braces < 0) {
          throw new Error(`Cannot update ${filePath}: invalid TOML at line ${index + 1}. Fix it before removing the agent.`);
        }
      }
    }
    if (quote) {
      throw new Error(`Cannot update ${filePath}: invalid TOML at line ${index + 1}. Fix it before removing the agent.`);
    }
    if (/^\s*\[/.test(line)) {
      const header = line.trim().match(/^(\[{1,2})(.+?)(\]{1,2})\s*(?:#.*)?$/);
      if (!header || header[1].length !== header[3].length) {
        throw new Error(`Cannot update ${filePath}: invalid TOML at line ${index + 1}. Fix it before removing the agent.`);
      }
    }
  }
  if (braces !== 0) {
    throw new Error(`Cannot update ${filePath}: invalid TOML at line ${lines.length}. Fix it before removing the agent.`);
  }
}
