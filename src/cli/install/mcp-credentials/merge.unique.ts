import type { CredentialRequirement } from './credential.requirement.ts';

/** Performs the merge unique operation. */
export function mergeUnique(requirements: CredentialRequirement[]): CredentialRequirement[] {
  return requirements.filter((item, index, array) =>
    array.findIndex((candidate) => candidate.envName === item.envName) === index,
  );
}
