/** Encodes unsafe or ambiguous UTF-8 values with MCP's Base64 header sentinel. */
export function encodeMcpHeaderValue(value: string): string {
  const plainAscii = /^[\x20-\x7E]*$/.test(value)
    && value === value.trim()
    && !(value.startsWith('=?base64?') && value.endsWith('?='));
  return plainAscii
    ? value
    : `=?base64?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

