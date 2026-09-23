




/** Describes the git hub code search response contract. */
export interface GitHubCodeSearchResponse {
  items?: Array<{
    path?: unknown;
    repository?: {
      full_name?: unknown;
    };
  }>;
}
