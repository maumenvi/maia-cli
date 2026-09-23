import type { MCPConfig } from '../../../tools/contracts/mcp.config.ts';
import { argumentValues } from './argument.values.ts';
import { inputMap } from './input.map.ts';
import type { RegistryServer } from './registry.server.ts';
import { versionedPackage } from './versioned.package.ts';

/** Performs the resolve mcp config operation. */
export function resolveMcpConfig(server: RegistryServer): MCPConfig | null {
  const npmPackage = server.packages?.find((item) =>
    item.registryType === 'npm'
    && item.identifier
    && (!item.transport?.type || item.transport.type === 'stdio'),
  );
  if (npmPackage?.identifier) {
    const runtimeArguments = argumentValues(npmPackage.runtimeArguments);
    return {
      transport: 'npx',
      package: versionedPackage(npmPackage.identifier, npmPackage.version ?? server.version),
      npxArgs: runtimeArguments.length > 0 ? runtimeArguments : ['-y'],
      args: argumentValues(npmPackage.packageArguments),
      env: inputMap(server.name ?? server.title ?? 'MCP', npmPackage.environmentVariables),
    };
  }

  const remote = server.remotes?.find((item) =>
    Boolean(item.url)
    && !item.url?.includes('{')
    && (item.type === 'streamable-http' || item.type === 'sse'),
  );
  if (!remote?.url) {
    return null;
  }

  return remote.type === 'sse'
    ? { transport: 'sse', url: remote.url, headers: inputMap(server.name ?? server.title ?? 'MCP', remote.headers) }
    : { transport: 'http', url: remote.url, headers: inputMap(server.name ?? server.title ?? 'MCP', remote.headers) };
}
