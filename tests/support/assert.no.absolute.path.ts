import assert from 'node:assert/strict';

/** Ensures generated project files do not embed machine-specific roots. */
export function assertNoAbsolutePath(
  contents: string,
  paths: { projectRoot: string; homeDir: string },
): void {
  assert.equal(contents.includes(paths.projectRoot), false, 'generated content must not include the project root');
  assert.equal(contents.includes(paths.homeDir), false, 'generated content must not include the user home');
}
