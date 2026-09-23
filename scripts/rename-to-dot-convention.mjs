#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoots = ['src', 'tests'];

// The published bin entrypoint; package.json references it by literal path.
const PROTECTED_PATHS = new Set([path.join('src', 'cli', 'index.ts')]);
// Fixtures are not TypeScript sources and are loaded by literal path.
const SKIPPED_DIRS = new Set([path.join('tests', 'fixtures')]);

/** Lists every .ts file under a root, skipping fixtures. */
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

/** Converts a basename to the dot convention, preserving the .test.ts suffix. */
function toDotName(basename) {
  const isTest = basename.endsWith('.test.ts');
  const stem = basename.slice(0, basename.length - (isTest ? '.test.ts'.length : '.ts'.length));
  return `${stem.split('-').join('.')}${isTest ? '.test.ts' : '.ts'}`;
}

const allFiles = sourceRoots.flatMap(listTypeScriptFiles);
const renames = new Map();

for (const relativePath of allFiles) {
  if (PROTECTED_PATHS.has(relativePath)) continue;
  const dir = path.dirname(relativePath);
  const basename = path.basename(relativePath);
  const renamed = toDotName(basename);
  if (renamed === basename) continue;
  renames.set(relativePath, path.join(dir, renamed));
}

// Refuse to run if two files would collapse onto the same name.
const destinations = new Map();
for (const [from, to] of renames) {
  if (destinations.has(to)) {
    console.error(`Collision: "${from}" and "${destinations.get(to)}" both become "${to}"`);
    process.exit(1);
  }
  destinations.set(to, from);
}

// Rewrite imports first, while the old paths still exist on disk.
const basenameRewrites = new Map();
for (const [from, to] of renames) {
  basenameRewrites.set(path.basename(from), path.basename(to));
}

let rewrittenFiles = 0;
for (const relativePath of allFiles) {
  const absolute = path.join(rootDir, relativePath);
  const original = readFileSync(absolute, 'utf8');
  // Matches both static `from '...'` and dynamic `import('...')` specifiers.
  const updated = original.replace(
    /((?:from\s+|import\s*\()['"])(\.[^'"]*?)(['"])/g,
    (match, prefix, specifier, suffix) => {
      const specifierDir = path.posix.dirname(specifier);
      const specifierBase = path.posix.basename(specifier);
      const renamedBase = basenameRewrites.get(specifierBase);
      if (!renamedBase) return match;
      const rebuilt = specifierDir === '.' ? `./${renamedBase}` : `${specifierDir}/${renamedBase}`;
      return `${prefix}${rebuilt}${suffix}`;
    },
  );
  if (updated !== original) {
    writeFileSync(absolute, updated);
    rewrittenFiles += 1;
  }
}

// Then move the files, preserving history.
for (const [from, to] of renames) {
  const result = spawnSync('git', ['mv', from, to], { cwd: rootDir, encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(`git mv failed for "${from}": ${result.stderr.trim()}`);
    process.exit(1);
  }
}

console.log(`Renamed ${renames.size} file(s); rewrote imports in ${rewrittenFiles} file(s).`);
