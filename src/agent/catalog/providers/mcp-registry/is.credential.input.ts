import type { RegistryInput } from './registry.input.ts';

/** Performs the is credential input operation. */
export function isCredentialInput(input: RegistryInput): boolean {
  const normalizedName = (input.name ?? '').toLowerCase();
  const normalizedDescription = (input.description ?? '').toLowerCase();
  return Boolean(
    input.isSecret
    || /token|key|secret|password|auth|bearer/.test(normalizedName)
    || /token|key|secret|password|auth|bearer|api/.test(normalizedDescription),
  );
}
