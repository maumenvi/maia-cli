





/** Performs the print lines operation. */
export function printLines(lines: string[]): void {
  if (lines.length === 0) {
    console.log('- none');
    return;
  }

  for (const line of lines) {
    console.log(`- ${line}`);
  }
}
