import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { collectCredentialsForTransport } from '../../src/agent/catalog/providers/mcp-registry/collect.credentials.for.transport.ts';
import type { RegistryServer } from '../../src/agent/catalog/providers/mcp-registry/registry.server.ts';

const npmPackage = {
  registryType: 'npm',
  identifier: '@upstash/context7-mcp',
  version: '4.1.1',
  environmentVariables: [{ name: 'CONTEXT7_API_KEY', isSecret: true }],
};

const httpRemote = {
  type: 'streamable-http',
  url: 'https://mcp.context7.com/mcp',
  headers: [{ name: 'Authorization', isSecret: true }],
};

describe('collectCredentialsForTransport', () => {
  it('collects only the npm credentials when an npm package is chosen', () => {
    const server = { name: 'context7', packages: [npmPackage], remotes: [httpRemote] } as unknown as RegistryServer;

    const names = collectCredentialsForTransport(server).map((c) => c.name);

    assert.deepEqual(names, ['CONTEXT7_API_KEY']);
    assert.equal(
      names.includes('Authorization'),
      false,
      'the remote header belongs to a transport that was not selected',
    );
  });

  it('collects the remote credentials when there is no npm package', () => {
    const server = { name: 'context7', remotes: [httpRemote] } as unknown as RegistryServer;

    const names = collectCredentialsForTransport(server).map((c) => c.name);

    assert.deepEqual(names, ['Authorization']);
  });

  it('returns nothing when the server declares neither', () => {
    const server = { name: 'empty' } as unknown as RegistryServer;

    assert.deepEqual(collectCredentialsForTransport(server), []);
  });

  it('ignores a remote whose url is a template, matching transport selection', () => {
    const server = {
      name: 'templated',
      remotes: [{ type: 'streamable-http', url: 'https://{region}.example.com/mcp', headers: [{ name: 'Authorization', isSecret: true }] }],
    } as unknown as RegistryServer;

    assert.deepEqual(collectCredentialsForTransport(server), []);
  });

  it('deduplicates a credential declared by more than one package', () => {
    const server = {
      name: 'dupes',
      packages: [npmPackage, { ...npmPackage, identifier: '@other/pkg' }],
    } as unknown as RegistryServer;

    assert.deepEqual(collectCredentialsForTransport(server).map((c) => c.name), ['CONTEXT7_API_KEY']);
  });
});
