#!/usr/bin/env node
/**
 * Tags the published release as vX.Y.Z and pushes the tag (feature 007, FR-011).
 *
 * Runs as `postpublish`, so it only fires after `npm publish` succeeded. It
 * never moves or force-pushes an existing tag, and runs git with argv only.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Returns the git tag name for a package version. */
export function releaseTagName(version) {
  return `v${version}`;
}

/** Decides what to do with the release tag given the repository state. */
export function decideTagAction({ dirty, existingSha, headSha }) {
  if (dirty) return 'refuse-dirty';
  if (!existingSha) return 'create';
  if (existingSha === headSha) return 'already-at-head';
  return 'refuse-moved';
}

/** Runs git with argv and returns trimmed stdout, failing loudly unless allowed. */
function git(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0 && !allowFailure) {
    process.stderr.write(result.stderr);
    throw new Error(`git ${args.join(' ')} failed`);
  }
  return result.status === 0 ? result.stdout.trim() : '';
}

/** Creates (when needed) and pushes the release tag for package.json's version. */
function main() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  process.chdir(rootDir);
  const { version } = JSON.parse(readFileSync(path.resolve(rootDir, 'package.json'), 'utf8'));
  const tag = releaseTagName(version);

  const action = decideTagAction({
    dirty: git(['status', '--porcelain']).length > 0,
    existingSha: git(['rev-parse', '-q', '--verify', `refs/tags/${tag}^{commit}`], { allowFailure: true }),
    headSha: git(['rev-parse', 'HEAD']),
  });

  if (action === 'refuse-dirty') {
    console.error('Refusing to tag: working tree is not clean');
    process.exit(1);
  }
  if (action === 'refuse-moved') {
    const existingSha = git(['rev-parse', `refs/tags/${tag}^{commit}`]);
    console.error(`Tag ${tag} already exists on ${existingSha}; refusing to move it`);
    process.exit(1);
  }
  if (action === 'create') {
    git(['tag', '-a', tag, '-m', `Release ${version}`]);
    console.log(`Created tag ${tag}`);
  } else {
    console.log(`Tag ${tag} already points to HEAD`);
  }

  git(['push', 'origin', tag]);
  console.log(`Pushed tag ${tag}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
