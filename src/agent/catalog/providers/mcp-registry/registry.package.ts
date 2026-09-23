import type { RegistryArgument } from './registry.argument.ts';
import type { RegistryInput } from './registry.input.ts';
import type { RegistryTransport } from './registry.transport.ts';

/** Describes the registry package contract. */
export interface RegistryPackage {
  registryType?: string;
  identifier?: string;
  version?: string;
  runtimeHint?: string;
  transport?: RegistryTransport;
  runtimeArguments?: RegistryArgument[];
  packageArguments?: RegistryArgument[];
  environmentVariables?: RegistryInput[];
}
