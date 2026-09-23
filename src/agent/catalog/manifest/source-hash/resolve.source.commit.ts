import { createHash } from 'node:crypto';

import type { CatalogSource } from '../../types/source/catalog.source.ts';
import { FULL_GIT_SHA_PATTERN } from './full.git.sha.pattern.ts';
import { resolveGitRefCommit } from './resolve.git.ref.commit.ts';

/** Performs the resolve source commit operation. */
export const resolveSourceCommit = (
  alias: string,
  source: CatalogSource,
): { commit: string; commitResolved: boolean } => {
  if (source.type !== 'git') {
    const revision = `${source.type}:${source.url}:${source.ref ?? 'latest'}`;
    return {
      commit: createHash('sha1').update(revision).digest('hex'),
      commitResolved: true,
    };
  }
  if (source.ref && FULL_GIT_SHA_PATTERN.test(source.ref)) {
    return { commit: source.ref.toLowerCase(), commitResolved: true };
  }
  const ref = source.ref ?? 'main';
  const resolved = source.url && /(github\.com|gitlab\.com|bitbucket\.org|\.git(?:\/)?$)/i.test(source.url)
    ? resolveGitRefCommit(source.url, ref)
    : null;
  if (resolved) {
    return { commit: resolved, commitResolved: true };
  }

  const raw = `${alias}:${source.url}:${ref}`;
  return {
    commit: createHash('sha1').update(raw).digest('hex'),
    commitResolved: false,
  };
};
