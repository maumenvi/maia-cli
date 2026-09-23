/** Fetches UTF-8 text and maps a missing remote object to `null`. */
export async function fetchText(url: string): Promise<string | null> {
  const response = await fetch(url);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch skill from ${url} (${response.status})`);
  }
  return response.text();
}

