import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toProxiedToolName } from '../../src/agent/mcp/server/collect/to.proxied.tool.name.ts';

const MCP_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

describe('toProxiedToolName', () => {
  it('strips the registry namespace and keeps a valid identifier', () => {
    const name = toProxiedToolName('io.github.upstash/context7', 'resolve-library-id');

    assert.match(name, MCP_NAME_PATTERN, 'agents reject names outside the MCP identifier charset');
    assert.equal(name, 'context7__resolve-library-id');
  });

  it('replaces dots and slashes that survive in the server segment', () => {
    const name = toProxiedToolName('ai.smithery/renCosta2025-context7fork', 'search');

    assert.match(name, MCP_NAME_PATTERN);
    assert.equal(name, 'renCosta2025-context7fork__search');
  });

  it('leaves an already simple server name untouched', () => {
    assert.equal(toProxiedToolName('filesystem', 'read_file'), 'filesystem__read_file');
  });

  it('sanitizes characters in the tool segment too', () => {
    const name = toProxiedToolName('server', 'weird.tool/name');

    assert.match(name, MCP_NAME_PATTERN);
  });

  it('keeps the double underscore separator so routing can split it', () => {
    const name = toProxiedToolName('io.github.upstash/context7', 'query-docs');

    const index = name.indexOf('__');
    assert.ok(index > 0, 'the separator must exist for the router to split on');
    assert.equal(name.slice(index + 2), 'query-docs', 'the tool segment must round-trip intact');
  });

  it('never produces an empty segment', () => {
    const name = toProxiedToolName('///', 'tool');

    assert.match(name, MCP_NAME_PATTERN);
    assert.ok(name.endsWith('__tool'));
  });
});
