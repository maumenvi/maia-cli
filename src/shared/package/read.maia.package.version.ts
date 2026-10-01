import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseMaiaPackageVersion } from './parse.maia.package.version.ts';
import { resolveMaiaPackageJsonPath } from './resolve.maia.package.json.path.ts';

let cachedVersion: string | undefined;

/**
 * Returns the running Maia version, read from its own package.json.
 *
 * This is the single source of truth for Maia's version: the CLI, the default
 * manifest source ref and the MCP client/server identities all read it here.
 * The file is read once per process.
 */
export function readMaiaPackageVersion(): string {
  if (cachedVersion === undefined) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = resolveMaiaPackageJsonPath(here, existsSync);
    cachedVersion = parseMaiaPackageVersion(readFileSync(packageJsonPath, 'utf8'));
  }

  return cachedVersion;
}
