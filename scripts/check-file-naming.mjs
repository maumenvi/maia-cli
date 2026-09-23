#!/usr/bin/env node
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoots = ['src', 'tests'];
const SKIPPED_DIRS = new Set([path.join('tests', 'fixtures')]);

/** Lists every .ts file under a root, skipping non-TypeScript fixtures. */
function listTypeScriptFiles(relativeRoot) {
  const files = [];
  const walk = (relativeDir) => {
    if (SKIPPED_DIRS.has(relativeDir)) return;
    for (const entry of readdirSync(path.join(rootDir, relativeDir))) {
      const relativeEntry = path.join(relativeDir, entry);
      if (statSync(path.join(rootDir, relativeEntry)).isDirectory()) {
        walk(relativeEntry);
      } else if (entry.endsWith('.ts')) {
        files.push(relativeEntry);
      }
    }
  };
  walk(relativeRoot);
  return files;
}

const offenders = sourceRoots
  .flatMap(listTypeScriptFiles)
  .filter((relativePath) => path.basename(relativePath).includes('-'));

if (offenders.length > 0) {
  console.error('File naming violations (Constitution Principle IX: separate words with "."):');
  for (const offender of offenders) console.error(`- ${offender}`);
  process.exit(1);
}

console.log('File naming is valid: every source file uses the dot convention.');
