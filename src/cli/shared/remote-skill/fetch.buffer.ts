/** Fetches a binary-safe body and maps a missing remote object to `null`. */
export async function fetchBuffer(url: string): Promise<Buffer | null> {
  const response = await fetch(url);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch skill from ${url} (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}
