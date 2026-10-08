





/** Describes the inject result contract. */
export interface InjectResult {
  configPath: string;
  created: boolean;
  updated: boolean;
  /** Whether the target file's serialized content differs from its previous content. */
  changed: boolean;
}
