import { createGitHubHeaders } from './create.git.hub.headers.ts';
import type { FetchFn } from './fetch.fn.ts';

/** Performs the fetch git hub json operation. */
export async function fetchGitHubJson<T>(url: string, fetchFn: FetchFn): Promise<T> {
  const response = await fetchFn(url, { headers: createGitHubHeaders() });
  if (!response.ok) {
    throw new Error(`GitHub request failed (${response.status}): ${url}`);
  }
  return response.json() as Promise<T>;
}
