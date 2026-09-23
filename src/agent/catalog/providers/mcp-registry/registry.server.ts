import type { RegistryPackage } from './registry.package.ts';
import type { RegistryTransport } from './registry.transport.ts';

/** Describes the registry server contract. */
export interface RegistryServer {
  name?: string;
  title?: string;
  description?: string;
  version?: string;
  repository?: { url?: string };
  packages?: RegistryPackage[];
  remotes?: RegistryTransport[];
}
