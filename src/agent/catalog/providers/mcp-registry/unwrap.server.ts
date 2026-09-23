import type { RegistryServer } from './registry.server.ts';

/** Performs the unwrap server operation. */
export function unwrapServer(entry: { server?: RegistryServer } | RegistryServer): RegistryServer {
  if (Object.prototype.hasOwnProperty.call(entry, 'server')) {
    return (entry as { server?: RegistryServer }).server ?? {};
  }
  return entry as RegistryServer;
}
