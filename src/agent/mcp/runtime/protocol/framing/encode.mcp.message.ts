
/** Performs the encode mcp message operation. */
export function encodeMcpMessage(payload: unknown): Buffer {
  const json = JSON.stringify(payload);
  return Buffer.from(`${json}\n`, 'utf8');
}
