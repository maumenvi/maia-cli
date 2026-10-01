import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Version declared in the repository's package.json, read straight from disk
 * so tests compare Maia's exposed version against an independent source.
 */
export const ROOT_PACKAGE_VERSION: string = (JSON.parse(
  readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf8'),
) as { version: string }).version;
