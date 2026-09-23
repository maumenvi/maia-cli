import type { RegistryInput } from './registry.input.ts';

/** Describes the registry argument contract. */
export interface RegistryArgument extends RegistryInput {
  type?: 'named' | 'positional';
  valueHint?: string;
}
