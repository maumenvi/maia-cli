import { readFileSync } from 'node:fs';

import type { CommandHandler } from '../../contracts/command.handler.ts';
import { resolvePackageJsonPath } from './resolve.package.json.path.ts';

/** Performs the version command operation. */
export const versionCommand: CommandHandler = async () => {
  const packageJsonPath = resolvePackageJsonPath();
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string };
  if (!packageJson.version) {
    throw new Error('package version not found');
  }
  console.log(packageJson.version);
};
