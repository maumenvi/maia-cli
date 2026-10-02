import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CatalogSearchResult } from '../../src/agent/catalog/providers/contracts/catalog.search.result.ts';
import { isExactCatalogIdentifier } from '../../src/cli/install/external/is.exact.catalog.identifier.ts';

const result = (name: string, id = name): CatalogSearchResult => ({
  id,
  kind: 'mcp',
  name,
  displayName: name,
  provider: 'mcp',
  source: 'registry',
  install: { type: 'mcp', vscode: { command: 'x' } },
});

describe('isExactCatalogIdentifier', () => {
  it('returns the single exact match, ignoring case', () => {
    const exact = result('context7');
    assert.equal(isExactCatalogIdentifier('Context7', [result('context7fork'), exact]), exact);
  });

  it('accepts canonical registry names', () => {
    const exact = result('io.github.upstash/context7');
    assert.equal(isExactCatalogIdentifier('io.github.upstash/context7', [exact]), exact);
  });

  it('is null when nothing or more than one result matches', () => {
    assert.equal(isExactCatalogIdentifier('context', [result('context7'), result('context7fork')]), null);
    assert.equal(isExactCatalogIdentifier('dup', [result('dup', 'a'), result('dup', 'b')]), null);
  });
});
