import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

import type { CatalogSource } from '../../../agent/catalog/types/source/catalog.source.ts';
import { fetchBuffer } from './fetch.buffer.ts';
import { parseTarArchive } from './parse.tar.archive.ts';
import type { SkillFiles } from './skill.files.ts';
import { stripCommonFolder } from './strip.common.folder.ts';
import type { WellKnownIndexEntry } from './well.known.index.entry.ts';

/**
 * Fetches a whole skill from a `.well-known` publisher. The discovery index
 * describes it as a single SKILL.md, a tar.gz archive, or (older indexes) a
 * list of files. Without an index, only SKILL.md can be fetched, and the user
 * is told that supporting files were not published.
 */
export async function fetchWellKnownSkillFiles(source: CatalogSource, name: string): Promise<SkillFiles | null> {
  const baseUrl = source.url.replace(/\/+$/, '');
  for (const directory of ['agent-skills', 'skills']) {
    const index = await fetchBuffer(`${baseUrl}/.well-known/${directory}/index.json`);
    const entry = index ? (JSON.parse(index.toString('utf8')) as { skills?: WellKnownIndexEntry[] }).skills?.find((skill) => skill.name === name) : undefined;
    if (!entry) continue;
    const resolve = (url: string) => new URL(url, `${baseUrl}/`).toString();
    const verified = (content: Buffer) => {
      const actual = `sha256:${createHash('sha256').update(content).digest('hex')}`;
      if (entry.digest && entry.digest !== actual) {
        throw new Error(`Skill "${name}" from ${baseUrl} does not match its published digest`);
      }
      return content;
    };

    if (Array.isArray(entry.files)) {
      const files: SkillFiles = [];
      for (const file of entry.files) {
        const content = await fetchBuffer(`${baseUrl}/.well-known/${directory}/${name}/${file}`);
        if (content === null) throw new Error(`Skill "${name}" lists ${file} but it is not published at ${baseUrl}`);
        files.push({ path: file, content });
      }
      return files;
    }
    if (entry.type === 'archive' && entry.url && /\.(tar\.gz|tgz)$/i.test(entry.url)) {
      const archive = await fetchBuffer(resolve(entry.url));
      if (archive === null) return null;
      return stripCommonFolder(parseTarArchive(name, gunzipSync(verified(archive))));
    }
    if (entry.type === 'skill-md' && entry.url) {
      const content = await fetchBuffer(resolve(entry.url));
      return content === null ? null : [{ path: 'SKILL.md', content: verified(content) }];
    }
  }

  for (const directory of ['agent-skills', 'skills']) {
    const content = await fetchBuffer(`${baseUrl}/.well-known/${directory}/${name}/SKILL.md`);
    if (content !== null) {
      console.warn(`warning: Only SKILL.md is available from ${baseUrl}; supporting files were not published.`);
      return [{ path: 'SKILL.md', content }];
    }
  }
  return null;
}
