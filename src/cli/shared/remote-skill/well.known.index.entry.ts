/** One skill entry of an Agent Skills discovery index (RFC 0.2, plus the older `files` list). */
export interface WellKnownIndexEntry {
  name?: string;
  type?: string;
  url?: string;
  digest?: string;
  files?: string[];
}
