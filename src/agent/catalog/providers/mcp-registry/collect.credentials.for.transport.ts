import { collectCredentialHints } from './collect.credential.hints.ts';
import { dedupeCredentialHints } from './dedupe.credential.hints.ts';
import type { RegistryServer } from './registry.server.ts';

/**
 * Collects credential hints only for the transport that will actually be used.
 *
 * A server may publish both an npm package and a hosted remote, each declaring
 * its own credential. Collecting from both created an env variable that nothing
 * ever reads — context7 asked for an API key and an Authorization header when
 * only the npm key is used — which reads like a missing credential and sends
 * people hunting for a problem that does not exist.
 *
 * The selection mirrors `resolveMcpConfig`: an npm stdio package wins, and the
 * remote is considered only when no such package exists.
 */
export function collectCredentialsForTransport(
  server: RegistryServer,
): Array<{ name: string; envName: string; description?: string; sourceUrl?: string }> {
  const serverName = server.name ?? server.title ?? 'MCP';
  const repositoryUrl = server.repository?.url;

  const npmPackage = server.packages?.find((item) =>
    item.registryType === 'npm'
    && item.identifier
    && (!item.transport?.type || item.transport.type === 'stdio'),
  );

  if (npmPackage?.identifier) {
    return dedupeCredentialHints(
      (server.packages ?? []).flatMap((item) =>
        collectCredentialHints(item.environmentVariables, serverName, repositoryUrl)),
    );
  }

  const remote = server.remotes?.find((item) =>
    Boolean(item.url)
    && !item.url?.includes('{')
    && (item.type === 'streamable-http' || item.type === 'sse'),
  );

  if (!remote) {
    return [];
  }

  return dedupeCredentialHints(collectCredentialHints(remote.headers, serverName, repositoryUrl || remote.url));
}

