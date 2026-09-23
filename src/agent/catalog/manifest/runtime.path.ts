import path from 'node:path';

import { config } from '../../../config/core/config.ts';

/** Performs the normalize registry path operation. */
export const normalizeRegistryPath = (entryPath: string): string => {
  if (path.isAbsolute(entryPath)) return entryPath;
  return path.resolve(config.paths.rootDir, 'data', entryPath);
};
