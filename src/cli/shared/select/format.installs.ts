


/** Performs the format installs operation. */
export function formatInstalls(value?: number): string {
  return value ? ` · ${value.toLocaleString('en-US')} installs` : '';
}
