import path from 'node:path';

import { __dirname } from './dirname.ts';

/** Resolves the package root from the scoped configuration directory. */
export const rootDir = path.resolve(__dirname, '../../..');
