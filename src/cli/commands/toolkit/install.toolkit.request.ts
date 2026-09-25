/** What the user asked `maia toolkit i` to do. */
export interface InstallToolkitRequest {
  name: string;
  version?: string;
  global: boolean;
  yes: boolean;
}
