/** Describes the subset of a GitHub tree entry used during skill discovery. */
export interface GitHubTreeEntry {
  path?: string;
  type?: string;
  /** Git file mode; `120000` marks a symbolic link. */
  mode?: string;
}
