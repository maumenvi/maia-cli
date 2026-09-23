import type { RegistryServer } from './registry.server.ts';

/** Describes the registry response contract. */
export interface RegistryResponse {
  servers?: Array<{ server?: RegistryServer } | RegistryServer>;
}
