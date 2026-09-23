import { DEFAULT_TIMEOUT_MS } from './default.timeout.ms.ts';
import type { FetchFn } from './fetch.fn.ts';

/** Performs the fetch with timeout operation. */
export async function fetchWithTimeout(fetchFn: FetchFn, input: string | URL, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
