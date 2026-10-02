/**
 * Lists the regular files of an uncompressed tar (ustar/GNU) archive. Links
 * and devices are refused; directories and metadata entries are skipped.
 */
export function parseTarArchive(name: string, archive: Buffer): Array<{ path: string; content: Buffer }> {
  const files: Array<{ path: string; content: Buffer }> = [];
  let offset = 0;
  let longName: string | undefined;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const field = (start: number, length: number) => header.subarray(start, start + length).toString('utf8').replace(/\0.*$/s, '');
    const size = parseInt(field(124, 12).trim() || '0', 8);
    const type = field(156, 1) || '0';
    const prefix = field(345, 155);
    const entryName = longName ?? (prefix ? `${prefix}/${field(0, 100)}` : field(0, 100));
    longName = undefined;
    const body = archive.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;

    if (type === 'L') {
      longName = body.toString('utf8').replace(/\0.*$/s, '');
    } else if (type === '0' || type === '7') {
      files.push({ path: entryName.replace(/^\.\//, ''), content: Buffer.from(body) });
    } else if (type === '1' || type === '2' || type === '3' || type === '4' || type === '6') {
      throw new Error(`Skill "${name}" contains an unsafe path: ${entryName}`);
    }
    // '5' (directory), 'x'/'g' (pax metadata) carry no file content.
  }
  return files;
}
