import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { gzipSync } from 'node:zlib';

import { fetchWellKnownSkillFiles } from '../../src/cli/shared/remote-skill/fetch.well.known.skill.files.ts';
import { parseTarArchive } from '../../src/cli/shared/remote-skill/parse.tar.archive.ts';

const BASE = 'https://skills.example.com';
const SOURCE = { type: 'well-known' as const, url: BASE };

/** Builds a minimal ustar archive from files (type '0') and optional raw entries. */
function tar(entries: Array<{ path: string; content?: string; type?: string }>): Buffer {
  const blocks: Buffer[] = [];
  for (const entry of entries) {
    const content = Buffer.from(entry.content ?? '');
    const header = Buffer.alloc(512);
    header.write(entry.path, 0, 'utf8');
    header.write('0000644\0', 100);
    header.write(`${content.length.toString(8).padStart(11, '0')}\0`, 124);
    header.write(entry.type ?? '0', 156);
    header.write('ustar\0', 257);
    blocks.push(header, content, Buffer.alloc((512 - (content.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}

/** Serves `routes` (url → body) and 404 for everything else, capturing warnings. */
async function serve<T>(routes: Record<string, Buffer | string>, run: () => Promise<T>): Promise<{ result: T; warnings: string[] }> {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')); };
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const body = routes[String(input)];
    return body === undefined ? new Response('missing', { status: 404 }) : new Response(body);
  }) as typeof fetch;
  try {
    return { result: await run(), warnings };
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
}

describe('fetchWellKnownSkillFiles', () => {
  it('extracts a tar.gz archive skill and checks its digest', async () => {
    const archive = gzipSync(tar([
      { path: 'wrangler/', type: '5' },
      { path: 'wrangler/SKILL.md', content: '# wrangler' },
      { path: 'wrangler/references/a.md', content: 'a' },
    ]));
    const digest = `sha256:${createHash('sha256').update(archive).digest('hex')}`;
    const { result } = await serve({
      [`${BASE}/.well-known/agent-skills/index.json`]: JSON.stringify({ skills: [{ name: 'wrangler', type: 'archive', url: '/.well-known/agent-skills/wrangler.tar.gz', digest }] }),
      [`${BASE}/.well-known/agent-skills/wrangler.tar.gz`]: archive,
    }, () => fetchWellKnownSkillFiles(SOURCE, 'wrangler'));
    assert.deepEqual(result?.map((file) => file.path).sort(), ['SKILL.md', 'references/a.md']);
  });

  it('rejects an archive whose digest does not match', async () => {
    const archive = gzipSync(tar([{ path: 'SKILL.md', content: '# x' }]));
    await assert.rejects(serve({
      [`${BASE}/.well-known/agent-skills/index.json`]: JSON.stringify({ skills: [{ name: 'x', type: 'archive', url: '/.well-known/agent-skills/x.tar.gz', digest: 'sha256:00' }] }),
      [`${BASE}/.well-known/agent-skills/x.tar.gz`]: archive,
    }, () => fetchWellKnownSkillFiles(SOURCE, 'x')), /does not match its published digest/);
  });

  it('downloads every file of an older index that lists them', async () => {
    const { result } = await serve({
      [`${BASE}/.well-known/skills/index.json`]: JSON.stringify({ skills: [{ name: 'x', files: ['SKILL.md', 'ref.md'] }] }),
      [`${BASE}/.well-known/skills/x/SKILL.md`]: '# x',
      [`${BASE}/.well-known/skills/x/ref.md`]: 'ref',
    }, () => fetchWellKnownSkillFiles(SOURCE, 'x'));
    assert.deepEqual(result?.map((file) => file.path), ['SKILL.md', 'ref.md']);
  });

  it('falls back to SKILL.md with a warning when no index is published', async () => {
    const { result, warnings } = await serve({
      [`${BASE}/.well-known/agent-skills/x/SKILL.md`]: '# x',
    }, () => fetchWellKnownSkillFiles(SOURCE, 'x'));
    assert.deepEqual(result?.map((file) => file.path), ['SKILL.md']);
    assert.ok(warnings.some((line) => line.includes('Only SKILL.md is available from https://skills.example.com')));
  });
});

describe('parseTarArchive', () => {
  it('refuses links inside the archive', () => {
    assert.throws(() => parseTarArchive('x', tar([{ path: 'x/SKILL.md', content: '#' }, { path: 'x/evil', type: '2' }])), /unsafe path: x\/evil/);
  });
});
