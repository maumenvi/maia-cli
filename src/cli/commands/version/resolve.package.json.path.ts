import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Resolves package metadata from source and compiled CLI layouts. */
export function resolvePackageJsonPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, '../../../../package.json'),
    path.resolve(here, '../../../../../package.json'),
  ];

  const packageJsonPath = candidates.find((candidate) => existsSync(candidate));
  if (!packageJsonPath) {
    throw new Error('package.json not found');
  }

  return packageJsonPath;
}
