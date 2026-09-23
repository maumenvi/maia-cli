import type { RegistryInput } from './registry.input.ts';

/** Describes the registry transport contract. */
export interface RegistryTransport {
  type?: 'stdio' | 'streamable-http' | 'sse';
  url?: string;
  headers?: RegistryInput[];
}
