import { tokenize } from './tokenize.ts';

/** Scores how closely a repository directory matches the requested skill name. */
export function scoreDirectoryMatch(requestedName: string, candidateName: string): number {
  const requestedTokens = tokenize(requestedName);
  const candidateTokens = tokenize(candidateName);
  if (requestedTokens.length === 0 || candidateTokens.length === 0) {
    return 0;
  }

  const requested = new Set(requestedTokens);
  const candidate = new Set(candidateTokens);
  let overlap = 0;
  for (const token of candidate) {
    if (requested.has(token)) {
      overlap += 1;
    }
  }

  if (overlap === 0) {
    return 0;
  }

  if (requestedName.includes(candidateName) || candidateName.includes(requestedName)) {
    return overlap + 0.5;
  }

  return overlap;
}

